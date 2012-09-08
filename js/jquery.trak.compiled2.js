jQuery.ajax = (function(_ajax){
    
    var protocol = location.protocol,
        hostname = location.hostname,
        exRegex = RegExp(protocol + '//' + hostname),
        YQL = 'http' + (/^https/.test(protocol)?'s':'') + '://query.yahooapis.com/v1/public/yql?callback=?',
        query = 'select * from html where url="{URL}" and xpath="*"';
    
    function isExternal(url) {
        return !exRegex.test(url) && /:\/\//.test(url);
    }
    
    return function(o) {
        
        var url = o.url;
        
        if ( /get/i.test(o.type) && !/json/i.test(o.dataType) && isExternal(url) ) {
            
            // Manipulate options so that JSONP-x request is made to YQL
            
            o.url = YQL;
            o.dataType = 'json';
            
            o.data = {
                q: query.replace(
                    '{URL}',
                    url + (o.data ?
                        (/\?/.test(url) ? '&' : '?') + jQuery.param(o.data)
                    : '')
                ),
                format: 'xml'
            };
            
            // Since it's a JSONP request
            // complete === success
            if (!o.success && o.complete) {
                o.success = o.complete;
                delete o.complete;
            }
            
            o.success = (function(_success){
                return function(data) {
                    
                    if (_success) {
                        // Fake XHR callback.
                        _success.call(this, {
                            responseText: data.results[0]
                                // YQL screws with <script>s
                                // Get rid of them
                                .replace(/<script[^>]+?\/>|<script(.|\s)*?\/script>/gi, '')
                        }, 'success');
                    }
                    
                };
            })(o.success);
            
        }
        
        return _ajax.apply(this, arguments);
        
    };
    
})(jQuery.ajax);
(function($) {

$.extend($.ui, { timepicker: { version: "0.9.9" } });

/* Time picker manager.
   Use the singleton instance of this class, $.timepicker, to interact with the time picker.
   Settings for (groups of) time pickers are maintained in an instance object,
   allowing multiple different settings on the same page. */

function Timepicker() {
	this.regional = []; // Available regional settings, indexed by language code
	this.regional[''] = { // Default regional settings
		currentText: 'Now',
		closeText: 'Done',
		ampm: false,
		amNames: ['AM', 'A'],
		pmNames: ['PM', 'P'],
		timeFormat: 'hh:mm tt',
		timeSuffix: '',
		timeOnlyTitle: 'Choose Time',
		timeText: 'Time',
		hourText: 'Hour',
		minuteText: 'Minute',
		secondText: 'Second',
		millisecText: 'Millisecond',
		timezoneText: 'Time Zone'
	};
	this._defaults = { // Global defaults for all the datetime picker instances
		showButtonPanel: true,
		timeOnly: false,
		showHour: true,
		showMinute: true,
		showSecond: false,
		showMillisec: false,
		showTimezone: false,
		showTime: true,
		stepHour: 1,
		stepMinute: 1,
		stepSecond: 1,
		stepMillisec: 1,
		hour: 0,
		minute: 0,
		second: 0,
		millisec: 0,
		timezone: '+0000',
		hourMin: 0,
		minuteMin: 0,
		secondMin: 0,
		millisecMin: 0,
		hourMax: 23,
		minuteMax: 59,
		secondMax: 59,
		millisecMax: 999,
		minDateTime: null,
		maxDateTime: null,
		onSelect: null,
		hourGrid: 0,
		minuteGrid: 0,
		secondGrid: 0,
		millisecGrid: 0,
		alwaysSetTime: true,
		separator: ' ',
		altFieldTimeOnly: true,
		showTimepicker: true,
		timezoneIso8609: false,
		timezoneList: null,
		addSliderAccess: false,
		sliderAccessArgs: null
	};
	$.extend(this._defaults, this.regional['']);
};

$.extend(Timepicker.prototype, {
	$input: null,
	$altInput: null,
	$timeObj: null,
	inst: null,
	hour_slider: null,
	minute_slider: null,
	second_slider: null,
	millisec_slider: null,
	timezone_select: null,
	hour: 0,
	minute: 0,
	second: 0,
	millisec: 0,
	timezone: '+0000',
	hourMinOriginal: null,
	minuteMinOriginal: null,
	secondMinOriginal: null,
	millisecMinOriginal: null,
	hourMaxOriginal: null,
	minuteMaxOriginal: null,
	secondMaxOriginal: null,
	millisecMaxOriginal: null,
	ampm: '',
	formattedDate: '',
	formattedTime: '',
	formattedDateTime: '',
	timezoneList: null,

	/* Override the default settings for all instances of the time picker.
	   @param  settings  object - the new settings to use as defaults (anonymous object)
	   @return the manager object */
	setDefaults: function(settings) {
		extendRemove(this._defaults, settings || {});
		return this;
	},

	//########################################################################
	// Create a new Timepicker instance
	//########################################################################
	_newInst: function($input, o) {
		var tp_inst = new Timepicker(),
			inlineSettings = {};
			
		for (var attrName in this._defaults) {
			var attrValue = $input.attr('time:' + attrName);
			if (attrValue) {
				try {
					inlineSettings[attrName] = eval(attrValue);
				} catch (err) {
					inlineSettings[attrName] = attrValue;
				}
			}
		}
		tp_inst._defaults = $.extend({}, this._defaults, inlineSettings, o, {
			beforeShow: function(input, dp_inst) {
				if ($.isFunction(o.beforeShow))
					return o.beforeShow(input, dp_inst, tp_inst);
			},
			onChangeMonthYear: function(year, month, dp_inst) {
				// Update the time as well : this prevents the time from disappearing from the $input field.
				tp_inst._updateDateTime(dp_inst);
				if ($.isFunction(o.onChangeMonthYear))
					o.onChangeMonthYear.call($input[0], year, month, dp_inst, tp_inst);
			},
			onClose: function(dateText, dp_inst) {
				if (tp_inst.timeDefined === true && $input.val() != '')
					tp_inst._updateDateTime(dp_inst);
				if ($.isFunction(o.onClose))
					o.onClose.call($input[0], dateText, dp_inst, tp_inst);
			},
			timepicker: tp_inst // add timepicker as a property of datepicker: $.datepicker._get(dp_inst, 'timepicker');
		});
		tp_inst.amNames = $.map(tp_inst._defaults.amNames, function(val) { return val.toUpperCase() });
		tp_inst.pmNames = $.map(tp_inst._defaults.pmNames, function(val) { return val.toUpperCase() });

		if (tp_inst._defaults.timezoneList === null) {
			var timezoneList = [];
			for (var i = -11; i <= 12; i++)
				timezoneList.push((i >= 0 ? '+' : '-') + ('0' + Math.abs(i).toString()).slice(-2) + '00');
			if (tp_inst._defaults.timezoneIso8609)
				timezoneList = $.map(timezoneList, function(val) {
					return val == '+0000' ? 'Z' : (val.substring(0, 3) + ':' + val.substring(3));
				});
			tp_inst._defaults.timezoneList = timezoneList;
		}

		tp_inst.hour = tp_inst._defaults.hour;
		tp_inst.minute = tp_inst._defaults.minute;
		tp_inst.second = tp_inst._defaults.second;
		tp_inst.millisec = tp_inst._defaults.millisec;
		tp_inst.ampm = '';
		tp_inst.$input = $input;

		if (o.altField)
			tp_inst.$altInput = $(o.altField)
				.css({ cursor: 'pointer' })
				.focus(function(){ $input.trigger("focus"); });
		
		if(tp_inst._defaults.minDate==0 || tp_inst._defaults.minDateTime==0)
		{
			tp_inst._defaults.minDate=new Date();
		}
		if(tp_inst._defaults.maxDate==0 || tp_inst._defaults.maxDateTime==0)
		{
			tp_inst._defaults.maxDate=new Date();
		}
		
		// datepicker needs minDate/maxDate, timepicker needs minDateTime/maxDateTime..
		if(tp_inst._defaults.minDate !== undefined && tp_inst._defaults.minDate instanceof Date)
			tp_inst._defaults.minDateTime = new Date(tp_inst._defaults.minDate.getTime());
		if(tp_inst._defaults.minDateTime !== undefined && tp_inst._defaults.minDateTime instanceof Date)
			tp_inst._defaults.minDate = new Date(tp_inst._defaults.minDateTime.getTime());
		if(tp_inst._defaults.maxDate !== undefined && tp_inst._defaults.maxDate instanceof Date)
			tp_inst._defaults.maxDateTime = new Date(tp_inst._defaults.maxDate.getTime());
		if(tp_inst._defaults.maxDateTime !== undefined && tp_inst._defaults.maxDateTime instanceof Date)
			tp_inst._defaults.maxDate = new Date(tp_inst._defaults.maxDateTime.getTime());
		return tp_inst;
	},

	//########################################################################
	// add our sliders to the calendar
	//########################################################################
	_addTimePicker: function(dp_inst) {
		var currDT = (this.$altInput && this._defaults.altFieldTimeOnly) ?
				this.$input.val() + ' ' + this.$altInput.val() : 
				this.$input.val();

		this.timeDefined = this._parseTime(currDT);
		this._limitMinMaxDateTime(dp_inst, false);
		this._injectTimePicker();
	},

	//########################################################################
	// parse the time string from input value or _setTime
	//########################################################################
	_parseTime: function(timeString, withDate) {
		var regstr = this._defaults.timeFormat.toString()
				.replace(/h{1,2}/ig, '(\\d?\\d)')
				.replace(/m{1,2}/ig, '(\\d?\\d)')
				.replace(/s{1,2}/ig, '(\\d?\\d)')
				.replace(/l{1}/ig, '(\\d?\\d?\\d)')
				.replace(/t{1,2}/ig, this._getPatternAmpm())
				.replace(/z{1}/ig, '(z|[-+]\\d\\d:?\\d\\d)?')
				.replace(/\s/g, '\\s?') + this._defaults.timeSuffix + '$',
			order = this._getFormatPositions(),
			ampm = '',
			treg;

		if (!this.inst) this.inst = $.datepicker._getInst(this.$input[0]);

		if (withDate || !this._defaults.timeOnly) {
			// the time should come after x number of characters and a space.
			// x = at least the length of text specified by the date format
			var dp_dateFormat = $.datepicker._get(this.inst, 'dateFormat');
			// escape special regex characters in the seperator
			var specials = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g");
			regstr = '^.{' + dp_dateFormat.length + ',}?' + this._defaults.separator.replace(specials, "\\$&") + regstr;
		}
		
		treg = timeString.match(new RegExp(regstr, 'i'));

		if (treg) {
			if (order.t !== -1) {
				if (treg[order.t] === undefined || treg[order.t].length === 0) {
					ampm = '';
					this.ampm = '';
				} else {
					ampm = $.inArray(treg[order.t].toUpperCase(), this.amNames) !== -1 ? 'AM' : 'PM';
					this.ampm = this._defaults[ampm == 'AM' ? 'amNames' : 'pmNames'][0];
				}
			}

			if (order.h !== -1) {
				if (ampm == 'AM' && treg[order.h] == '12')
					this.hour = 0; // 12am = 0 hour
				else if (ampm == 'PM' && treg[order.h] != '12')
					this.hour = (parseFloat(treg[order.h]) + 12).toFixed(0); // 12pm = 12 hour, any other pm = hour + 12
				else this.hour = Number(treg[order.h]);
			}

			if (order.m !== -1) this.minute = Number(treg[order.m]);
			if (order.s !== -1) this.second = Number(treg[order.s]);
			if (order.l !== -1) this.millisec = Number(treg[order.l]);
			if (order.z !== -1 && treg[order.z] !== undefined) {
				var tz = treg[order.z].toUpperCase();
				switch (tz.length) {
				case 1:	// Z
					tz = this._defaults.timezoneIso8609 ? 'Z' : '+0000';
					break;
				case 5:	// +hhmm
					if (this._defaults.timezoneIso8609)
						tz = tz.substring(1) == '0000'
						   ? 'Z'
						   : tz.substring(0, 3) + ':' + tz.substring(3);
					break;
				case 6:	// +hh:mm
					if (!this._defaults.timezoneIso8609)
						tz = tz == 'Z' || tz.substring(1) == '00:00'
						   ? '+0000'
						   : tz.replace(/:/, '');
					else if (tz.substring(1) == '00:00')
						tz = 'Z';
					break;
				}
				this.timezone = tz;
			}
			
			return true;

		}
		return false;
	},

	//########################################################################
	// pattern for standard and localized AM/PM markers
	//########################################################################
	_getPatternAmpm: function() {
		var markers = [];
			o = this._defaults;
		if (o.amNames)
			$.merge(markers, o.amNames);
		if (o.pmNames)
			$.merge(markers, o.pmNames);
		markers = $.map(markers, function(val) { return val.replace(/[.*+?|()\[\]{}\\]/g, '\\$&') });
		return '(' + markers.join('|') + ')?';
	},

	//########################################################################
	// figure out position of time elements.. cause js cant do named captures
	//########################################################################
	_getFormatPositions: function() {
		var finds = this._defaults.timeFormat.toLowerCase().match(/(h{1,2}|m{1,2}|s{1,2}|l{1}|t{1,2}|z)/g),
			orders = { h: -1, m: -1, s: -1, l: -1, t: -1, z: -1 };

		if (finds)
			for (var i = 0; i < finds.length; i++)
				if (orders[finds[i].toString().charAt(0)] == -1)
					orders[finds[i].toString().charAt(0)] = i + 1;

		return orders;
	},

	//########################################################################
	// generate and inject html for timepicker into ui datepicker
	//########################################################################
	_injectTimePicker: function() {
		var $dp = this.inst.dpDiv,
			o = this._defaults,
			tp_inst = this,
			// Added by Peter Medeiros:
			// - Figure out what the hour/minute/second max should be based on the step values.
			// - Example: if stepMinute is 15, then minMax is 45.
			hourMax = parseInt((o.hourMax - ((o.hourMax - o.hourMin) % o.stepHour)) ,10),
			minMax  = parseInt((o.minuteMax - ((o.minuteMax - o.minuteMin) % o.stepMinute)) ,10),
			secMax  = parseInt((o.secondMax - ((o.secondMax - o.secondMin) % o.stepSecond)) ,10),
			millisecMax  = parseInt((o.millisecMax - ((o.millisecMax - o.millisecMin) % o.stepMillisec)) ,10),
			dp_id = this.inst.id.toString().replace(/([^A-Za-z0-9_])/g, '');

		// Prevent displaying twice
		//if ($dp.find("div#ui-timepicker-div-"+ dp_id).length === 0) {
		if ($dp.find("div#ui-timepicker-div-"+ dp_id).length === 0 && o.showTimepicker) {
			var noDisplay = ' style="display:none;"',
				html =	'<div class="ui-timepicker-div" id="ui-timepicker-div-' + dp_id + '"><dl>' +
						'<dt class="ui_tpicker_time_label" id="ui_tpicker_time_label_' + dp_id + '"' +
						((o.showTime) ? '' : noDisplay) + '>' + o.timeText + '</dt>' +
						'<dd class="ui_tpicker_time" id="ui_tpicker_time_' + dp_id + '"' +
						((o.showTime) ? '' : noDisplay) + '></dd>' +
						'<dt class="ui_tpicker_hour_label" id="ui_tpicker_hour_label_' + dp_id + '"' +
						((o.showHour) ? '' : noDisplay) + '>' + o.hourText + '</dt>',
				hourGridSize = 0,
				minuteGridSize = 0,
				secondGridSize = 0,
				millisecGridSize = 0,
				size;

 			// Hours
			html += '<dd class="ui_tpicker_hour"><div id="ui_tpicker_hour_' + dp_id + '"' +
						((o.showHour) ? '' : noDisplay) + '></div>';
			if (o.showHour && o.hourGrid > 0) {
				html += '<div style="padding-left: 1px"><table class="ui-tpicker-grid-label"><tr>';

				for (var h = o.hourMin; h <= hourMax; h += parseInt(o.hourGrid,10)) {
					hourGridSize++;
					var tmph = (o.ampm && h > 12) ? h-12 : h;
					if (tmph < 10) tmph = '0' + tmph;
					if (o.ampm) {
						if (h == 0) tmph = 12 +'a';
						else if (h < 12) tmph += 'a';
						else tmph += 'p';
					}
					html += '<td>' + tmph + '</td>';
				}

				html += '</tr></table></div>';
			}
			html += '</dd>';

			// Minutes
			html += '<dt class="ui_tpicker_minute_label" id="ui_tpicker_minute_label_' + dp_id + '"' +
					((o.showMinute) ? '' : noDisplay) + '>' + o.minuteText + '</dt>'+
					'<dd class="ui_tpicker_minute"><div id="ui_tpicker_minute_' + dp_id + '"' +
							((o.showMinute) ? '' : noDisplay) + '></div>';

			if (o.showMinute && o.minuteGrid > 0) {
				html += '<div style="padding-left: 1px"><table class="ui-tpicker-grid-label"><tr>';

				for (var m = o.minuteMin; m <= minMax; m += parseInt(o.minuteGrid,10)) {
					minuteGridSize++;
					html += '<td>' + ((m < 10) ? '0' : '') + m + '</td>';
				}

				html += '</tr></table></div>';
			}
			html += '</dd>';

			// Seconds
			html += '<dt class="ui_tpicker_second_label" id="ui_tpicker_second_label_' + dp_id + '"' +
					((o.showSecond) ? '' : noDisplay) + '>' + o.secondText + '</dt>'+
					'<dd class="ui_tpicker_second"><div id="ui_tpicker_second_' + dp_id + '"'+
							((o.showSecond) ? '' : noDisplay) + '></div>';

			if (o.showSecond && o.secondGrid > 0) {
				html += '<div style="padding-left: 1px"><table><tr>';

				for (var s = o.secondMin; s <= secMax; s += parseInt(o.secondGrid,10)) {
					secondGridSize++;
					html += '<td>' + ((s < 10) ? '0' : '') + s + '</td>';
				}

				html += '</tr></table></div>';
			}
			html += '</dd>';

			// Milliseconds
			html += '<dt class="ui_tpicker_millisec_label" id="ui_tpicker_millisec_label_' + dp_id + '"' +
					((o.showMillisec) ? '' : noDisplay) + '>' + o.millisecText + '</dt>'+
					'<dd class="ui_tpicker_millisec"><div id="ui_tpicker_millisec_' + dp_id + '"'+
							((o.showMillisec) ? '' : noDisplay) + '></div>';

			if (o.showMillisec && o.millisecGrid > 0) {
				html += '<div style="padding-left: 1px"><table><tr>';

				for (var l = o.millisecMin; l <= millisecMax; l += parseInt(o.millisecGrid,10)) {
					millisecGridSize++;
					html += '<td>' + ((l < 10) ? '0' : '') + l + '</td>';
				}

				html += '</tr></table></div>';
			}
			html += '</dd>';

			// Timezone
			html += '<dt class="ui_tpicker_timezone_label" id="ui_tpicker_timezone_label_' + dp_id + '"' +
					((o.showTimezone) ? '' : noDisplay) + '>' + o.timezoneText + '</dt>';
			html += '<dd class="ui_tpicker_timezone" id="ui_tpicker_timezone_' + dp_id + '"'	+
							((o.showTimezone) ? '' : noDisplay) + '></dd>';

			html += '</dl></div>';
			$tp = $(html);

				// if we only want time picker...
			if (o.timeOnly === true) {
				$tp.prepend(
					'<div class="ui-widget-header ui-helper-clearfix ui-corner-all">' +
						'<div class="ui-datepicker-title">' + o.timeOnlyTitle + '</div>' +
					'</div>');
				$dp.find('.ui-datepicker-header, .ui-datepicker-calendar').hide();
			}

			this.hour_slider = $tp.find('#ui_tpicker_hour_'+ dp_id).slider({
				orientation: "horizontal",
				value: this.hour,
				min: o.hourMin,
				max: hourMax,
				step: o.stepHour,
				slide: function(event, ui) {
					tp_inst.hour_slider.slider( "option", "value", ui.value);
					tp_inst._onTimeChange();
				}
			});

			
			// Updated by Peter Medeiros:
			// - Pass in Event and UI instance into slide function
			this.minute_slider = $tp.find('#ui_tpicker_minute_'+ dp_id).slider({
				orientation: "horizontal",
				value: this.minute,
				min: o.minuteMin,
				max: minMax,
				step: o.stepMinute,
				slide: function(event, ui) {
					tp_inst.minute_slider.slider( "option", "value", ui.value);
					tp_inst._onTimeChange();
				}
			});

			this.second_slider = $tp.find('#ui_tpicker_second_'+ dp_id).slider({
				orientation: "horizontal",
				value: this.second,
				min: o.secondMin,
				max: secMax,
				step: o.stepSecond,
				slide: function(event, ui) {
					tp_inst.second_slider.slider( "option", "value", ui.value);
					tp_inst._onTimeChange();
				}
			});

			this.millisec_slider = $tp.find('#ui_tpicker_millisec_'+ dp_id).slider({
				orientation: "horizontal",
				value: this.millisec,
				min: o.millisecMin,
				max: millisecMax,
				step: o.stepMillisec,
				slide: function(event, ui) {
					tp_inst.millisec_slider.slider( "option", "value", ui.value);
					tp_inst._onTimeChange();
				}
			});

			this.timezone_select = $tp.find('#ui_tpicker_timezone_'+ dp_id).append('<select></select>').find("select");
			$.fn.append.apply(this.timezone_select,
				$.map(o.timezoneList, function(val, idx) {
					return $("<option />")
						.val(typeof val == "object" ? val.value : val)
						.text(typeof val == "object" ? val.label : val);
				})
			);
			this.timezone_select.val((typeof this.timezone != "undefined" && this.timezone != null && this.timezone != "") ? this.timezone : o.timezone);
			this.timezone_select.change(function() {
				tp_inst._onTimeChange();
			});

			// Add grid functionality
			if (o.showHour && o.hourGrid > 0) {
				size = 100 * hourGridSize * o.hourGrid / (hourMax - o.hourMin);

				$tp.find(".ui_tpicker_hour table").css({
					width: size + "%",
					marginLeft: (size / (-2 * hourGridSize)) + "%",
					borderCollapse: 'collapse'
				}).find("td").each( function(index) {
					$(this).click(function() {
						var h = $(this).html();
						if(o.ampm)	{
							var ap = h.substring(2).toLowerCase(),
								aph = parseInt(h.substring(0,2), 10);
							if (ap == 'a') {
								if (aph == 12) h = 0;
								else h = aph;
							} else if (aph == 12) h = 12;
							else h = aph + 12;
						}
						tp_inst.hour_slider.slider("option", "value", h);
						tp_inst._onTimeChange();
						tp_inst._onSelectHandler();
					}).css({
						cursor: 'pointer',
						width: (100 / hourGridSize) + '%',
						textAlign: 'center',
						overflow: 'hidden'
					});
				});
			}

			if (o.showMinute && o.minuteGrid > 0) {
				size = 100 * minuteGridSize * o.minuteGrid / (minMax - o.minuteMin);
				$tp.find(".ui_tpicker_minute table").css({
					width: size + "%",
					marginLeft: (size / (-2 * minuteGridSize)) + "%",
					borderCollapse: 'collapse'
				}).find("td").each(function(index) {
					$(this).click(function() {
						tp_inst.minute_slider.slider("option", "value", $(this).html());
						tp_inst._onTimeChange();
						tp_inst._onSelectHandler();
					}).css({
						cursor: 'pointer',
						width: (100 / minuteGridSize) + '%',
						textAlign: 'center',
						overflow: 'hidden'
					});
				});
			}

			if (o.showSecond && o.secondGrid > 0) {
				$tp.find(".ui_tpicker_second table").css({
					width: size + "%",
					marginLeft: (size / (-2 * secondGridSize)) + "%",
					borderCollapse: 'collapse'
				}).find("td").each(function(index) {
					$(this).click(function() {
						tp_inst.second_slider.slider("option", "value", $(this).html());
						tp_inst._onTimeChange();
						tp_inst._onSelectHandler();
					}).css({
						cursor: 'pointer',
						width: (100 / secondGridSize) + '%',
						textAlign: 'center',
						overflow: 'hidden'
					});
				});
			}

			if (o.showMillisec && o.millisecGrid > 0) {
				$tp.find(".ui_tpicker_millisec table").css({
					width: size + "%",
					marginLeft: (size / (-2 * millisecGridSize)) + "%",
					borderCollapse: 'collapse'
				}).find("td").each(function(index) {
					$(this).click(function() {
						tp_inst.millisec_slider.slider("option", "value", $(this).html());
						tp_inst._onTimeChange();
						tp_inst._onSelectHandler();
					}).css({
						cursor: 'pointer',
						width: (100 / millisecGridSize) + '%',
						textAlign: 'center',
						overflow: 'hidden'
					});
				});
			}

			var $buttonPanel = $dp.find('.ui-datepicker-buttonpane');
			if ($buttonPanel.length) $buttonPanel.before($tp);
			else $dp.append($tp);

			this.$timeObj = $tp.find('#ui_tpicker_time_'+ dp_id);

			if (this.inst !== null) {
				var timeDefined = this.timeDefined;
				this._onTimeChange();
				this.timeDefined = timeDefined;
			}

			//Emulate datepicker onSelect behavior. Call on slidestop.
			var onSelectDelegate = function() {
				tp_inst._onSelectHandler();
			};
			this.hour_slider.bind('slidestop',onSelectDelegate);
			this.minute_slider.bind('slidestop',onSelectDelegate);
			this.second_slider.bind('slidestop',onSelectDelegate);
			this.millisec_slider.bind('slidestop',onSelectDelegate);
			
			// slideAccess integration: http://trentrichardson.com/2011/11/11/jquery-ui-sliders-and-touch-accessibility/
			if (this._defaults.addSliderAccess){
				var sliderAccessArgs = this._defaults.sliderAccessArgs;
				setTimeout(function(){ // fix for inline mode
					if($tp.find('.ui-slider-access').length == 0){
						$tp.find('.ui-slider:visible').sliderAccess(sliderAccessArgs);

						// fix any grids since sliders are shorter
						var sliderAccessWidth = $tp.find('.ui-slider-access:eq(0)').outerWidth(true);
						if(sliderAccessWidth){
							$tp.find('table:visible').each(function(){
								var $g = $(this),
									oldWidth = $g.outerWidth(),
									oldMarginLeft = $g.css('marginLeft').toString().replace('%',''),
									newWidth = oldWidth - sliderAccessWidth,
									newMarginLeft = ((oldMarginLeft * newWidth)/oldWidth) + '%';
						
								$g.css({ width: newWidth, marginLeft: newMarginLeft });
							});
						}
					}
				},0);
			}
			// end slideAccess integration
			
		}
	},

	//########################################################################
	// This function tries to limit the ability to go outside the
	// min/max date range
	//########################################################################
	_limitMinMaxDateTime: function(dp_inst, adjustSliders){
		var o = this._defaults,
			dp_date = new Date(dp_inst.selectedYear, dp_inst.selectedMonth, dp_inst.selectedDay);

		if(!this._defaults.showTimepicker) return; // No time so nothing to check here

		if($.datepicker._get(dp_inst, 'minDateTime') !== null && $.datepicker._get(dp_inst, 'minDateTime') !== undefined && dp_date){
			var minDateTime = $.datepicker._get(dp_inst, 'minDateTime'),
				minDateTimeDate = new Date(minDateTime.getFullYear(), minDateTime.getMonth(), minDateTime.getDate(), 0, 0, 0, 0);

			if(this.hourMinOriginal === null || this.minuteMinOriginal === null || this.secondMinOriginal === null || this.millisecMinOriginal === null){
				this.hourMinOriginal = o.hourMin;
				this.minuteMinOriginal = o.minuteMin;
				this.secondMinOriginal = o.secondMin;
				this.millisecMinOriginal = o.millisecMin;
			}

			if(dp_inst.settings.timeOnly || minDateTimeDate.getTime() == dp_date.getTime()) {
				this._defaults.hourMin = minDateTime.getHours();
				if (this.hour <= this._defaults.hourMin) {
					this.hour = this._defaults.hourMin;
					this._defaults.minuteMin = minDateTime.getMinutes();
					if (this.minute <= this._defaults.minuteMin) {
						this.minute = this._defaults.minuteMin;
						this._defaults.secondMin = minDateTime.getSeconds();
					} else if (this.second <= this._defaults.secondMin){
						this.second = this._defaults.secondMin;
						this._defaults.millisecMin = minDateTime.getMilliseconds();
					} else {
						if(this.millisec < this._defaults.millisecMin)
							this.millisec = this._defaults.millisecMin;
						this._defaults.millisecMin = this.millisecMinOriginal;
					}
				} else {
					this._defaults.minuteMin = this.minuteMinOriginal;
					this._defaults.secondMin = this.secondMinOriginal;
					this._defaults.millisecMin = this.millisecMinOriginal;
				}
			}else{
				this._defaults.hourMin = this.hourMinOriginal;
				this._defaults.minuteMin = this.minuteMinOriginal;
				this._defaults.secondMin = this.secondMinOriginal;
				this._defaults.millisecMin = this.millisecMinOriginal;
			}
		}

		if($.datepicker._get(dp_inst, 'maxDateTime') !== null && $.datepicker._get(dp_inst, 'maxDateTime') !== undefined && dp_date){
			var maxDateTime = $.datepicker._get(dp_inst, 'maxDateTime'),
				maxDateTimeDate = new Date(maxDateTime.getFullYear(), maxDateTime.getMonth(), maxDateTime.getDate(), 0, 0, 0, 0);

			if(this.hourMaxOriginal === null || this.minuteMaxOriginal === null || this.secondMaxOriginal === null){
				this.hourMaxOriginal = o.hourMax;
				this.minuteMaxOriginal = o.minuteMax;
				this.secondMaxOriginal = o.secondMax;
				this.millisecMaxOriginal = o.millisecMax;
			}

			if(dp_inst.settings.timeOnly || maxDateTimeDate.getTime() == dp_date.getTime()){
				this._defaults.hourMax = maxDateTime.getHours();
				if (this.hour >= this._defaults.hourMax) {
					this.hour = this._defaults.hourMax;
					this._defaults.minuteMax = maxDateTime.getMinutes();
					if (this.minute >= this._defaults.minuteMax) {
						this.minute = this._defaults.minuteMax;
						this._defaults.secondMax = maxDateTime.getSeconds();
					} else if (this.second >= this._defaults.secondMax) {
						this.second = this._defaults.secondMax;
						this._defaults.millisecMax = maxDateTime.getMilliseconds();
					} else {
						if(this.millisec > this._defaults.millisecMax) this.millisec = this._defaults.millisecMax;
						this._defaults.millisecMax = this.millisecMaxOriginal;
					}
				} else {
					this._defaults.minuteMax = this.minuteMaxOriginal;
					this._defaults.secondMax = this.secondMaxOriginal;
					this._defaults.millisecMax = this.millisecMaxOriginal;
				}
			}else{
				this._defaults.hourMax = this.hourMaxOriginal;
				this._defaults.minuteMax = this.minuteMaxOriginal;
				this._defaults.secondMax = this.secondMaxOriginal;
				this._defaults.millisecMax = this.millisecMaxOriginal;
			}
		}

		if(adjustSliders !== undefined && adjustSliders === true){
			var hourMax = parseInt((this._defaults.hourMax - ((this._defaults.hourMax - this._defaults.hourMin) % this._defaults.stepHour)) ,10),
                minMax  = parseInt((this._defaults.minuteMax - ((this._defaults.minuteMax - this._defaults.minuteMin) % this._defaults.stepMinute)) ,10),
                secMax  = parseInt((this._defaults.secondMax - ((this._defaults.secondMax - this._defaults.secondMin) % this._defaults.stepSecond)) ,10),
				millisecMax  = parseInt((this._defaults.millisecMax - ((this._defaults.millisecMax - this._defaults.millisecMin) % this._defaults.stepMillisec)) ,10);

			if(this.hour_slider)
				this.hour_slider.slider("option", { min: this._defaults.hourMin, max: hourMax }).slider('value', this.hour);
			if(this.minute_slider)
				this.minute_slider.slider("option", { min: this._defaults.minuteMin, max: minMax }).slider('value', this.minute);
			if(this.second_slider)
				this.second_slider.slider("option", { min: this._defaults.secondMin, max: secMax }).slider('value', this.second);
			if(this.millisec_slider)
				this.millisec_slider.slider("option", { min: this._defaults.millisecMin, max: millisecMax }).slider('value', this.millisec);
		}

	},

	
	//########################################################################
	// when a slider moves, set the internal time...
	// on time change is also called when the time is updated in the text field
	//########################################################################
	_onTimeChange: function() {
		var hour   = (this.hour_slider) ? this.hour_slider.slider('value') : false,
			minute = (this.minute_slider) ? this.minute_slider.slider('value') : false,
			second = (this.second_slider) ? this.second_slider.slider('value') : false,
			millisec = (this.millisec_slider) ? this.millisec_slider.slider('value') : false,
			timezone = (this.timezone_select) ? this.timezone_select.val() : false,
			o = this._defaults;

		if (typeof(hour) == 'object') hour = false;
		if (typeof(minute) == 'object') minute = false;
		if (typeof(second) == 'object') second = false;
		if (typeof(millisec) == 'object') millisec = false;
		if (typeof(timezone) == 'object') timezone = false;

		if (hour !== false) hour = parseInt(hour,10);
		if (minute !== false) minute = parseInt(minute,10);
		if (second !== false) second = parseInt(second,10);
		if (millisec !== false) millisec = parseInt(millisec,10);

		var ampm = o[hour < 12 ? 'amNames' : 'pmNames'][0];

		// If the update was done in the input field, the input field should not be updated.
		// If the update was done using the sliders, update the input field.
		var hasChanged = (hour != this.hour || minute != this.minute
				|| second != this.second || millisec != this.millisec
				|| (this.ampm.length > 0
				    && (hour < 12) != ($.inArray(this.ampm.toUpperCase(), this.amNames) !== -1))
				|| timezone != this.timezone);
		
		if (hasChanged) {

			if (hour !== false)this.hour = hour;
			if (minute !== false) this.minute = minute;
			if (second !== false) this.second = second;
			if (millisec !== false) this.millisec = millisec;
			if (timezone !== false) this.timezone = timezone;
			
			if (!this.inst) this.inst = $.datepicker._getInst(this.$input[0]);
			
			this._limitMinMaxDateTime(this.inst, true);
		}
		if (o.ampm) this.ampm = ampm;
		
		//this._formatTime();
		this.formattedTime = $.datepicker.formatTime(this._defaults.timeFormat, this, this._defaults);
		if (this.$timeObj) this.$timeObj.text(this.formattedTime + o.timeSuffix);
		this.timeDefined = true;
		if (hasChanged) this._updateDateTime();
	},
    
	//########################################################################
	// call custom onSelect. 
	// bind to sliders slidestop, and grid click.
	//########################################################################
	_onSelectHandler: function() {
		var onSelect = this._defaults.onSelect;
		var inputEl = this.$input ? this.$input[0] : null;
		if (onSelect && inputEl) {
			onSelect.apply(inputEl, [this.formattedDateTime, this]);
		}
	},

	//########################################################################
	// left for any backwards compatibility
	//########################################################################
	_formatTime: function(time, format) {
		time = time || { hour: this.hour, minute: this.minute, second: this.second, millisec: this.millisec, ampm: this.ampm, timezone: this.timezone };
		var tmptime = (format || this._defaults.timeFormat).toString();

		tmptime = $.datepicker.formatTime(tmptime, time, this._defaults);
		
		if (arguments.length) return tmptime;
		else this.formattedTime = tmptime;
	},

	//########################################################################
	// update our input with the new date time..
	//########################################################################
	_updateDateTime: function(dp_inst) {
		dp_inst = this.inst || dp_inst;
		var dt = $.datepicker._daylightSavingAdjust(new Date(dp_inst.selectedYear, dp_inst.selectedMonth, dp_inst.selectedDay)),
			dateFmt = $.datepicker._get(dp_inst, 'dateFormat'),
			formatCfg = $.datepicker._getFormatConfig(dp_inst),
			timeAvailable = dt !== null && this.timeDefined;
		this.formattedDate = $.datepicker.formatDate(dateFmt, (dt === null ? new Date() : dt), formatCfg);
		var formattedDateTime = this.formattedDate;
		if (dp_inst.lastVal !== undefined && (dp_inst.lastVal.length > 0 && this.$input.val().length === 0))
			return;

		if (this._defaults.timeOnly === true) {
			formattedDateTime = this.formattedTime;
		} else if (this._defaults.timeOnly !== true && (this._defaults.alwaysSetTime || timeAvailable)) {
			formattedDateTime += this._defaults.separator + this.formattedTime + this._defaults.timeSuffix;
		}

		this.formattedDateTime = formattedDateTime;

		if(!this._defaults.showTimepicker) {
			this.$input.val(this.formattedDate);
		} else if (this.$altInput && this._defaults.altFieldTimeOnly === true) {
			this.$altInput.val(this.formattedTime);
			this.$input.val(this.formattedDate);
		} else if(this.$altInput) {
			this.$altInput.val(formattedDateTime);
			this.$input.val(formattedDateTime);
		} else {
			this.$input.val(formattedDateTime);
		}
		
		this.$input.trigger("change");
	}

});

$.fn.extend({
	//########################################################################
	// shorthand just to use timepicker..
	//########################################################################
	timepicker: function(o) {
		o = o || {};
		var tmp_args = arguments;

		if (typeof o == 'object') tmp_args[0] = $.extend(o, { timeOnly: true });

		return $(this).each(function() {
			$.fn.datetimepicker.apply($(this), tmp_args);
		});
	},

	//########################################################################
	// extend timepicker to datepicker
	//########################################################################
	datetimepicker: function(o) {
		o = o || {};
		var $input = this,
		tmp_args = arguments;

		if (typeof(o) == 'string'){
			if(o == 'getDate') 
				return $.fn.datepicker.apply($(this[0]), tmp_args);
			else 
				return this.each(function() {
					var $t = $(this);
					$t.datepicker.apply($t, tmp_args);
				});
		}
		else
			return this.each(function() {
				var $t = $(this);
				$t.datepicker($.timepicker._newInst($t, o)._defaults);
			});
	}
});

//########################################################################
// format the time all pretty... 
// format = string format of the time
// time = a {}, not a Date() for timezones
// options = essentially the regional[].. amNames, pmNames, ampm
//########################################################################
$.datepicker.formatTime = function(format, time, options) {
	options = options || {};
	options = $.extend($.timepicker._defaults, options);
	time = $.extend({hour:0, minute:0, second:0, millisec:0, timezone:'+0000'}, time);
	
	var tmptime = format;
	var ampmName = options['amNames'][0];

	var hour = parseInt(time.hour, 10);
	if (options.ampm) {
		if (hour > 11){
			ampmName = options['pmNames'][0];
			if(hour > 12)
				hour = hour % 12;
		}
		if (hour === 0)
			hour = 12;
	}
	tmptime = tmptime.replace(/(?:hh?|mm?|ss?|[tT]{1,2}|[lz])/g, function(match) {
		switch (match.toLowerCase()) {
			case 'hh': return ('0' + hour).slice(-2);
			case 'h':  return hour;
			case 'mm': return ('0' + time.minute).slice(-2);
			case 'm':  return time.minute;
			case 'ss': return ('0' + time.second).slice(-2);
			case 's':  return time.second;
			case 'l':  return ('00' + time.millisec).slice(-3);
			case 'z':  return time.timezone;
			case 't': case 'tt':
				if (options.ampm) {
					if (match.length == 1)
						ampmName = ampmName.charAt(0);
					return match.charAt(0) == 'T' ? ampmName.toUpperCase() : ampmName.toLowerCase();
				}
				return '';
		}
	});

	tmptime = $.trim(tmptime);
	return tmptime;
}

//########################################################################
// the bad hack :/ override datepicker so it doesnt close on select
// inspired: http://stackoverflow.com/questions/1252512/jquery-datepicker-prevent-closing-picker-when-clicking-a-date/1762378#1762378
//########################################################################
$.datepicker._base_selectDate = $.datepicker._selectDate;
$.datepicker._selectDate = function (id, dateStr) {
	var inst = this._getInst($(id)[0]),
		tp_inst = this._get(inst, 'timepicker');

	if (tp_inst) {
		tp_inst._limitMinMaxDateTime(inst, true);
		inst.inline = inst.stay_open = true;
		//This way the onSelect handler called from calendarpicker get the full dateTime
		this._base_selectDate(id, dateStr);
		inst.inline = inst.stay_open = false;
		this._notifyChange(inst);
		this._updateDatepicker(inst);
	}
	else this._base_selectDate(id, dateStr);
};

//#############################################################################################
// second bad hack :/ override datepicker so it triggers an event when changing the input field
// and does not redraw the datepicker on every selectDate event
//#############################################################################################
$.datepicker._base_updateDatepicker = $.datepicker._updateDatepicker;
$.datepicker._updateDatepicker = function(inst) {

	// don't popup the datepicker if there is another instance already opened
	var input = inst.input[0];
	if($.datepicker._curInst &&
	   $.datepicker._curInst != inst &&
	   $.datepicker._datepickerShowing &&
	   $.datepicker._lastInput != input) {
		return;
	}

	if (typeof(inst.stay_open) !== 'boolean' || inst.stay_open === false) {
				
		this._base_updateDatepicker(inst);
		
		// Reload the time control when changing something in the input text field.
		var tp_inst = this._get(inst, 'timepicker');
		if(tp_inst) tp_inst._addTimePicker(inst);
	}
};

//#######################################################################################
// third bad hack :/ override datepicker so it allows spaces and colon in the input field
//#######################################################################################
$.datepicker._base_doKeyPress = $.datepicker._doKeyPress;
$.datepicker._doKeyPress = function(event) {
	var inst = $.datepicker._getInst(event.target),
		tp_inst = $.datepicker._get(inst, 'timepicker');

	if (tp_inst) {
		if ($.datepicker._get(inst, 'constrainInput')) {
			var ampm = tp_inst._defaults.ampm,
				dateChars = $.datepicker._possibleChars($.datepicker._get(inst, 'dateFormat')),
				datetimeChars = tp_inst._defaults.timeFormat.toString()
								.replace(/[hms]/g, '')
								.replace(/TT/g, ampm ? 'APM' : '')
								.replace(/Tt/g, ampm ? 'AaPpMm' : '')
								.replace(/tT/g, ampm ? 'AaPpMm' : '')
								.replace(/T/g, ampm ? 'AP' : '')
								.replace(/tt/g, ampm ? 'apm' : '')
								.replace(/t/g, ampm ? 'ap' : '') +
								" " +
								tp_inst._defaults.separator +
								tp_inst._defaults.timeSuffix +
								(tp_inst._defaults.showTimezone ? tp_inst._defaults.timezoneList.join('') : '') +
								(tp_inst._defaults.amNames.join('')) +
								(tp_inst._defaults.pmNames.join('')) +
								dateChars,
				chr = String.fromCharCode(event.charCode === undefined ? event.keyCode : event.charCode);
			return event.ctrlKey || (chr < ' ' || !dateChars || datetimeChars.indexOf(chr) > -1);
		}
	}
	
	return $.datepicker._base_doKeyPress(event);
};

//#######################################################################################
// Override key up event to sync manual input changes.
//#######################################################################################
$.datepicker._base_doKeyUp = $.datepicker._doKeyUp;
$.datepicker._doKeyUp = function (event) {
	var inst = $.datepicker._getInst(event.target),
		tp_inst = $.datepicker._get(inst, 'timepicker');

	if (tp_inst) {
		if (tp_inst._defaults.timeOnly && (inst.input.val() != inst.lastVal)) {
			try {
				$.datepicker._updateDatepicker(inst);
			}
			catch (err) {
				$.datepicker.log(err);
			}
		}
	}

	return $.datepicker._base_doKeyUp(event);
};

//#######################################################################################
// override "Today" button to also grab the time.
//#######################################################################################
$.datepicker._base_gotoToday = $.datepicker._gotoToday;
$.datepicker._gotoToday = function(id) {
	var inst = this._getInst($(id)[0]),
		$dp = inst.dpDiv;
	this._base_gotoToday(id);
	var now = new Date();
	var tp_inst = this._get(inst, 'timepicker');
	if (tp_inst && tp_inst._defaults.showTimezone && tp_inst.timezone_select) {
		var tzoffset = now.getTimezoneOffset(); // If +0100, returns -60
		var tzsign = tzoffset > 0 ? '-' : '+';
		tzoffset = Math.abs(tzoffset);
		var tzmin = tzoffset % 60;
		tzoffset = tzsign + ('0' + (tzoffset - tzmin) / 60).slice(-2) + ('0' + tzmin).slice(-2);
		if (tp_inst._defaults.timezoneIso8609)
			tzoffset = tzoffset.substring(0, 3) + ':' + tzoffset.substring(3);
		tp_inst.timezone_select.val(tzoffset);
	}
	this._setTime(inst, now);
	$( '.ui-datepicker-today', $dp).click(); 
};

//#######################################################################################
// Disable & enable the Time in the datetimepicker
//#######################################################################################
$.datepicker._disableTimepickerDatepicker = function(target, date, withDate) {
	var inst = this._getInst(target),
	tp_inst = this._get(inst, 'timepicker');
	$(target).datepicker('getDate'); // Init selected[Year|Month|Day]
	if (tp_inst) {
		tp_inst._defaults.showTimepicker = false;
		tp_inst._updateDateTime(inst);
	}
};

$.datepicker._enableTimepickerDatepicker = function(target, date, withDate) {
	var inst = this._getInst(target),
	tp_inst = this._get(inst, 'timepicker');
	$(target).datepicker('getDate'); // Init selected[Year|Month|Day]
	if (tp_inst) {
		tp_inst._defaults.showTimepicker = true;
		tp_inst._addTimePicker(inst); // Could be disabled on page load
		tp_inst._updateDateTime(inst);
	}
};

//#######################################################################################
// Create our own set time function
//#######################################################################################
$.datepicker._setTime = function(inst, date) {
	var tp_inst = this._get(inst, 'timepicker');
	if (tp_inst) {
		var defaults = tp_inst._defaults,
			// calling _setTime with no date sets time to defaults
			hour = date ? date.getHours() : defaults.hour,
			minute = date ? date.getMinutes() : defaults.minute,
			second = date ? date.getSeconds() : defaults.second,
			millisec = date ? date.getMilliseconds() : defaults.millisec;

		//check if within min/max times..
		if ((hour < defaults.hourMin || hour > defaults.hourMax) || (minute < defaults.minuteMin || minute > defaults.minuteMax) || (second < defaults.secondMin || second > defaults.secondMax) || (millisec < defaults.millisecMin || millisec > defaults.millisecMax)) {
			hour = defaults.hourMin;
			minute = defaults.minuteMin;
			second = defaults.secondMin;
			millisec = defaults.millisecMin;
		}

		tp_inst.hour = hour;
		tp_inst.minute = minute;
		tp_inst.second = second;
		tp_inst.millisec = millisec;

		if (tp_inst.hour_slider) tp_inst.hour_slider.slider('value', hour);
		if (tp_inst.minute_slider) tp_inst.minute_slider.slider('value', minute);
		if (tp_inst.second_slider) tp_inst.second_slider.slider('value', second);
		if (tp_inst.millisec_slider) tp_inst.millisec_slider.slider('value', millisec);

		tp_inst._onTimeChange();
		tp_inst._updateDateTime(inst);
	}
};

//#######################################################################################
// Create new public method to set only time, callable as $().datepicker('setTime', date)
//#######################################################################################
$.datepicker._setTimeDatepicker = function(target, date, withDate) {
	var inst = this._getInst(target),
		tp_inst = this._get(inst, 'timepicker');

	if (tp_inst) {
		this._setDateFromField(inst);
		var tp_date;
		if (date) {
			if (typeof date == "string") {
				tp_inst._parseTime(date, withDate);
				tp_date = new Date();
				tp_date.setHours(tp_inst.hour, tp_inst.minute, tp_inst.second, tp_inst.millisec);
			}
			else tp_date = new Date(date.getTime());
			if (tp_date.toString() == 'Invalid Date') tp_date = undefined;
			this._setTime(inst, tp_date);
		}
	}

};

//#######################################################################################
// override setDate() to allow setting time too within Date object
//#######################################################################################
$.datepicker._base_setDateDatepicker = $.datepicker._setDateDatepicker;
$.datepicker._setDateDatepicker = function(target, date) {
	var inst = this._getInst(target),
	tp_date = (date instanceof Date) ? new Date(date.getTime()) : date;

	this._updateDatepicker(inst);
	this._base_setDateDatepicker.apply(this, arguments);
	this._setTimeDatepicker(target, tp_date, true);
};

//#######################################################################################
// override getDate() to allow getting time too within Date object
//#######################################################################################
$.datepicker._base_getDateDatepicker = $.datepicker._getDateDatepicker;
$.datepicker._getDateDatepicker = function(target, noDefault) {
	var inst = this._getInst(target),
		tp_inst = this._get(inst, 'timepicker');

	if (tp_inst) {
		this._setDateFromField(inst, noDefault);
		var date = this._getDate(inst);
		if (date && tp_inst._parseTime($(target).val(), tp_inst.timeOnly)) date.setHours(tp_inst.hour, tp_inst.minute, tp_inst.second, tp_inst.millisec);
		return date;
	}
	return this._base_getDateDatepicker(target, noDefault);
};

//#######################################################################################
// override parseDate() because UI 1.8.14 throws an error about "Extra characters"
// An option in datapicker to ignore extra format characters would be nicer.
//#######################################################################################
$.datepicker._base_parseDate = $.datepicker.parseDate;
$.datepicker.parseDate = function(format, value, settings) {
	var date;
	try {
		date = this._base_parseDate(format, value, settings);
	} catch (err) {
		if (err.indexOf(":") >= 0) {
			// Hack!  The error message ends with a colon, a space, and
			// the "extra" characters.  We rely on that instead of
			// attempting to perfectly reproduce the parsing algorithm.
			date = this._base_parseDate(format, value.substring(0,value.length-(err.length-err.indexOf(':')-2)), settings);
		} else {
			// The underlying error was not related to the time
			throw err;
		}
	}
	return date;
};

//#######################################################################################
// override formatDate to set date with time to the input
//#######################################################################################
$.datepicker._base_formatDate=$.datepicker._formatDate;
$.datepicker._formatDate = function(inst, day, month, year){
	var tp_inst = this._get(inst, 'timepicker');
	if(tp_inst)
	{
		if(day)
			var b = this._base_formatDate(inst, day, month, year);
		tp_inst._updateDateTime(inst);	
		return tp_inst.$input.val();
	}
	return this._base_formatDate(inst);
};

//#######################################################################################
// override options setter to add time to maxDate(Time) and minDate(Time). MaxDate
//#######################################################################################
$.datepicker._base_optionDatepicker = $.datepicker._optionDatepicker;
$.datepicker._optionDatepicker = function(target, name, value) {
	var inst = this._getInst(target),
		tp_inst = this._get(inst, 'timepicker');
	if (tp_inst) {
		var min,max,onselect;
		if (typeof name == 'string') { // if min/max was set with the string
			if (name==='minDate' || name==='minDateTime' )
				min = value;
			else if (name==='maxDate' || name==='maxDateTime')
				max = value;
			else if (name==='onSelect')
				onselect=value;
		} else if (typeof name == 'object') { //if min/max was set with the JSON
			if(name.minDate)
				min = name.minDate;
			else if (name.minDateTime)
				min = name.minDateTime;
			else if (name.maxDate)
				max = name.maxDate;
			else if (name.maxDateTime)
				max = name.maxDateTime;
		}
		if(min){ //if min was set
			if(min==0)
				min=new Date();
			else
				min= new Date(min);
			
			tp_inst._defaults.minDate = min;
			tp_inst._defaults.minDateTime = min;
		} else if (max){ //if max was set
			if(max==0)
				max=new Date();
			else
				max= new Date(max);
			tp_inst._defaults.maxDate = max;
			tp_inst._defaults.maxDateTime = max;
		}
		else if (onselect)
			tp_inst._defaults.onSelect=onselect;
	}
	if (value === undefined)
		return this._base_optionDatepicker(target, name);
	return this._base_optionDatepicker(target, name, value);
};

//#######################################################################################
// jQuery extend now ignores nulls!
//#######################################################################################
function extendRemove(target, props) {
	$.extend(target, props);
	for (var name in props)
		if (props[name] === null || props[name] === undefined)
			target[name] = props[name];
	return target;
};

$.timepicker = new Timepicker(); // singleton instance
$.timepicker.version = "0.9.9";

})(jQuery);
(function($) {
    // remove layerX and layerY
    var all = $.event.props,
        len = all.length,
        res = [];
    while (len--) {
      var el = all[len];
      if (el != 'layerX' && el != 'layerY') res.push(el);
    }
    $.event.props = res;
})(jQuery);
jQuery.fn.print = function(){
	// NOTE: We are trimming the jQuery collection down to the
	// first element in the collection.
	if (this.size() > 1){
		this.eq( 0 ).print();
		return;
	} else if (!this.size()){
		return;
	}
 
	// ASSERT: At this point, we know that the current jQuery
	// collection (as defined by THIS), contains only one
	// printable element.
 
	// Create a random name for the print frame.
	var strFrameName = ("printer-" + (new Date()).getTime());
 
	// Create an iFrame with the new name.
	var jFrame = $( "<iframe name='" + strFrameName + "'>" );
 
	// Hide the frame (sort of) and attach to the body.
	jFrame
		.css( "width", "1px" )
		.css( "height", "1px" )
		.css( "position", "absolute" )
		.css( "left", "-9999px" )
		.appendTo( $( "body:first" ) )
	;
 
	// Get a FRAMES reference to the new frame.
	var objFrame = window.frames[ strFrameName ];
 
	// Get a reference to the DOM in the new frame.
	var objDoc = objFrame.document;
 
	// Grab all the style tags and copy to the new
	// document so that we capture look and feel of
	// the current document.
 
	// Create a temp document DIV to hold the style tags.
	// This is the only way I could find to get the style
	// tags into IE.
	var jStyleDiv = $( "<div>" ).append(
		$( "style" ).clone()
		);
 
	// Write the HTML for the document. In this, we will
	// write out the HTML of the current element.
	objDoc.open();
	objDoc.write( "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">" );
	objDoc.write( "<html>" );
	objDoc.write( "<body>" );
	objDoc.write( "<head>" );
	objDoc.write( "<title>" );
	objDoc.write( document.title );
	objDoc.write( "</title>" );
	objDoc.write( jStyleDiv.html() );
	objDoc.write( "</head>" );
	objDoc.write( this.html() );
	objDoc.write( "</body>" );
	objDoc.write( "</html>" );
	objDoc.close();
 
	// Print the document.
	objFrame.focus();
	objFrame.print();
 
	// Have the frame remove itself in about a minute so that
	// we don't build up too many of these frames.
	setTimeout(
		function(){
			jFrame.remove();
		},
		(60 * 1000)
		);
};


var HOST  = 'pattrak.dyndns.org/MyWeb/trak';

// Aes.Ctr.encrypt(    ,__PW,256)

var trak = {

	init:			function() {

						// Default AJAX options
						//
						$.ajaxSetup({
						  url:		trak.url,
						  type:		'POST',
						  error:	function(http, message, exc) {
						 				trak.confirm("<p>There was a problem communicating with Trak server. Your data may have been lost. Please try again later.</p><p><small>" + message + ":: " + exc +"</small></p>",250);
										$(".ui-dialog-buttonpane").button("enable");

						  			}
						});
						scheduler.config.xml_date="%Y-%m-%d %H:%i";
						scheduler.config.api_date="%Y-%m-%d %H:%i";
						scheduler.config.details_on_dblclick	= true;
						scheduler.config.details_on_create		= true;
						scheduler.locale.labels.section_location	= "Location of appointment";
						scheduler.locale.labels.section_porter		= "Porter";
						scheduler.locale.labels.section_description	= "Appointment description";
						scheduler.locale.labels.section_event_desc	= "Notes";
						scheduler.locale.labels.section_status		= "Status";
												
						scheduler.config.lightbox.sections=[	
							{ name:"description", height:50, map_to:"text", type:"textarea", focus:true },
							{ name:"location", height:43, map_to:"event_location", type:"textarea"  },
							{ name:"porter", height:21, map_to:"event_porter", type:"select", options:[
										{key:0, label:"Yes, porter required (wheelchair)"},
										{key:1, label:"Yes, porter required (bed)"},
										{key:2, label:"No, porter not required"}
								] },
							{ name:"time", height:72, type:"time", map_to:"auto"},	
							{ name:"event_desc", height:43, map_to:"event_desc", type:"textarea"  },
							{ name:"status", height:21, map_to:'status', type:"select", options:[
										{key:1, label:"Required"},
										{key:2, label:"Booked"},
										{key:4, label:"Complete"},
										{key:8, label:"Checked"},
										{key:16, label:"Done"}
								] }
						];

						// Bootstrap
						//
						trak.dialogInit();
						dialog.dialog({
						  close:	function() {
										trak.dialogFinish();
									},
						  width:	320,
						  height:	360,
						  title:	"Welcome to Trak",
						  modal:	false,
						  resizable:	false,
						  create:	function() {
						  
								// $('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Live</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Test</label></div>');
								// $(".db").buttonset();
						  
		$('.ui-dialog-buttonpane').append('<div id="login-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
						  
						  },
						  buttons:	trak.buttons.login
						 }).load(
							trak.url,
							{
								act:'login'
							},
							function() {
							
								$("#formLogin input[name=pw]").focus();
								$("#formLogin").submit(function() {
									trak.buttons.login.Login();
									return false;
								});
								
								// Auto-login
								 $("#formLogin input[name=pw]").val('trak');
								 $("#formLogin").submit();
								
							}
						 );	
						 
					},
	boot:			{
	
		ok:			function(){
		
		trak.dialogFinish();
		$(".trakPatient").html('<tr><td><img src="gfx/fbThrobber.gif" /></td></tr>');
		trak.support();
		trak.actions();
		if (trak.fn.readCookie('cookieSite') == null) {
				trak.refresh(1,1,0,0);
		} else {
				trak.refresh(trak.fn.readCookie('cookieSite'),trak.fn.readCookie('cookieWard'),0,0);
		};
		$('.hdrDialogButtons').buttonset().css('font-size','13px');
		
		//$('#_wards').buttonset().css('font-size','13px');
		$('#hdrWardList div').button().css('font-size','14px');
		$('#hdrFilterList div').button().css('font-size','14px');
		$('.hdrSelWard').button().css('font-size','14px');
		$('.hdrFilter').button().css('font-size','14px');
		//intervalRefresh = setInterval(trak.interval,trak.refreshTime*1000);
		$('#trakButtons').fadeIn('slow');	
		
		},
		reject:		function(){
		
			$("#formLogin input[name=pw]").effect("highlight", {color:'#FF0000'}, 'slow').val('').focus();
			trak.fn.loginThrobberOff();
			$('#login-throbber').hide();
		}
		
	},
	dialogInit:		function() {
					if ($("#"+trak.dialog).length == 0) {
				  		dialog = $('<div id="'+trak.dialog+'"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
				 	}
				 	else
				 	{
					 		// Temporary
					 		trak.dialogFinish();
				 	};
				},
	dialogFinish:	function() {
	
		dialog.dialog("destroy");
		dialog.remove();
	
					},
	refresh:		function(refreshSite,refreshWard,refreshFilter,refreshList) {


		var refreshTimeout = setTimeout(function(){
			$(".trakPatient").html('<tr><td><img src="gfx/fbThrobber.gif" /></td></tr>');
		},750);
	
		$.ajax({
			data:    ({
						act:	"write",
						site:	refreshSite,
						ward:	refreshWard,
						filter: refreshFilter,
						list:	refreshList,
						_pw:	Aes.Ctr.encrypt(__PW,__PW,256)
					 }),
			success: function(data) {
						clearTimeout(refreshTimeout);
						$('.trakPatient').remove();
						$('#trakButtons').after(data);						
						sID=refreshSite;
						wID=refreshWard;
						fID=refreshFilter;
						lID=refreshList;
						trak.fn.createCookie('cookieSite',sID,28);
						trak.fn.createCookie('cookieWard',wID,28);
						for (var x in decodeNameIDList) {
							trak.fn.decodeName(decodeNameIDList[x]);  
						};
						for (var x in referralRewriteIDList) {
							$("#refImg_" + referralRewriteIDList[x]).addClass("_R").css({opacity:0.4});
						};
						for (var x in jobsRefFadedList) {
						
							$('#jobID_' + jobsRefFadedList[x]).css({opacity:0.4});
						
						};
						for (var x in jobsRefOverdueList) {
						
							$('#jobID_' + jobsRefOverdueList[x]).addClass('_fl');					
						
						};
						
						}
		}); // $.ajax	
	},
	refreshRow:		function(vid) {
	
		//$("#patBoxID_"+vid).fadeOut('fast');
		
		var refreshRowTimeout = setTimeout(function(){
			$("#_pn" + vid).find("dl").html('<img src="gfx/fbThrobber.gif" />');
			$("#patBoxRefID_" + vid).find("._refs").html('');
			$("#patBoxRefID_" + vid).find("._stat").html('');
			$("#noteTD_" + vid).find("._stat").html('');
			$("#noteTD_" + vid).find("._notes").html('');
		},250);
		$.ajax({
			data:    ({
						act:	"write",
						filter: 0,
						list:	300,
						vid:	vid,
						site:	sID,
						ward:	wID,
						_pw:	Aes.Ctr.encrypt(__PW,__PW,256)
					 }),
			success: function(data){
						// Parse and insert data
						clearTimeout(refreshRowTimeout);
						$("#patBoxID_"+vid).replaceWith(data);
						// Must toggle the padlock and set the toggle bit to keep hiding working
						$("#patBoxID_"+vid+" .patient-toggle").data('toggled',1);
					   	//$('#patBoxID_'+vid).fadeIn('fast');
					   	if ($('#patBoxID_'+vid).hasClass('_dull')) {
							 $('#patBoxID_'+vid).removeClass('_dull').addClass('x_dull');
					   	};
						$("#patBoxID_"+vid+" .patient-toggle").find("img:first").attr({src:"gfx/document_decrypt.png"});						// Copied and adapted from .pBLB
						for (i in trak.visRef[vid]) {
							$('#refHREF_' + trak.visRef[vid][i]).addClass('patient-referral');
						};
						for (i in trak.jobsRefIDList[vid]) {
							$('#jobID_' + trak.jobsRefIDList[vid][i]).addClass('patient-jobs');
	    				};
						for (var x in decodeNameIDList) {
							trak.fn.decodeName(decodeNameIDList[x]);  
						};
						for (var x in referralRewriteIDList) {
							$("#refImg_" + referralRewriteIDList[x]).addClass("_R").css({opacity:0.4});
						};
						for (var x in jobsRefFadedList) {
						
							$('#jobID_' + jobsRefFadedList[x]).css({opacity:0.4});
						
						};
						for (var x in jobsRefOverdueList) {
						
							$('#jobID_' + jobsRefOverdueList[x]).addClass('_fl');					
						
						};
					 }		 
		});
	
	},
	interval:		function() {
	
	},
	confirm:		function(message,height) {
	
			var confirm = $("#dialog-confirm");
			if ($("#dialog-confirm").length == 0) {
				confirm = $('<div id="dialog-confirm" title="Warning!">	<p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px '+height+'px 0;"></span>'+message+'</p></div>').appendTo('body');
			};
			confirm.dialog({
				resizable:	false,
				height:		height,
				modal:		true,
				buttons:	{
								"OK": function() {
									confirm.dialog('close');
									confirm.dialog("destroy");
									confirm.remove();
								}
							}
			}).css('font-size','14px');
			$('.ui-button').blur();

	},
	fn:				{
	
		decodeName:		function(id) {
	
		_AESObj = $("#_pn"+id).find('dt');
		_AESObj.html(Aes.Ctr.decrypt(_AESObj.html(),__PW,256));
	
	},
		decode:			function(id) {
	
		_AESObj = $(id);
		_AESObj.html(Aes.Ctr.decrypt(_AESObj.html(),__PW,256));
	
	},
		tick:			function(id,Y,m,d,G,i,s) {
		
			$("#tCount_"+id).countdown({
			
				onTick:		trak.fn.longWait,
				serverSync:	trak.fn.serverTime,
				since:		new Date(Y,m,d,G,i,s),
				format:		'HMS',
				layout:		'➘ {hn}<span id="xpoint">{sep}</span>{mnn}<span id="xpoint">{sep}</span>{snn}'
			
			});

		},
		longWait:		function(periods) {
	
				if ( periods[4] > 3) {
					$(this).addClass('_red');
				};
				
	},
		getUrlVars:		function(url) {

			var vars = [], hash;
			var hashes = url.slice(url.indexOf('?') + 1).split('&');
			for(var i = 0; i < hashes.length; i++)
			{
				hash = hashes[i].split('=');
				vars.push(hash[0]);
				vars[hash[0]] = hash[1];
			}
			return vars;
		
	},
		serverTime:		function() {

			var time = null; 
			$.ajax({
				async:		false,
				dataType:	'text', 
				data: 		{
								act:	"ajax",
								type:	"serverTime"
							},
				success:	function(text) { 
					time = new Date(text); 
				},
				error:		function(http, message, exc) { 
					time = new Date(); 
			}
			}); 
			return time; 	
	
	},
		createCookie:	function(name,value,days) {
	
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
	
	},
		readCookie:		function(name) {
	
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
	
	},
		readCookieN:	function(name,str) {
	
	var nameEQ = name + "=";
	var ca = str.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
	
	},
		eraseCookie:	function(name) {
	
		createCookie(name,"",-1);
	
	},
		forms:			{
		
					common:		function() {
	
	 _rxChanged = 0;				
	$('._cond ._R').hover(function(){
   				$(this).parent().addClass("_drughover");
  			},function(){
   				$(this).parent().removeClass("_drughover");
   			}).click(function(){
   				_rxChanged = 1;
      			$(this).parent().remove();			
   			});				
					
					},
					pmhx:		function() {
					
	$("#condAddButton").button({icons:{primary: "ui-icon-plus"}}).click(function(){

		_rxChanged = 1;
		$('#hlist').append(function(){
			_s = '<span class="_cond">';
			_e = '</span>';
			_name	= $('input[name=pmhxauto]').val();
			_id		= '<input value="" type="hidden" name="pmhx">';
			_nameid	= '<input value="'+ $('input[name=pmhxauto]').val() +'" type="hidden" name="pmhxname">';
			_remove = '<a class="_R" href="#">✪</a>';
			return (_s + _name + _id + _nameid + _remove + _e);
		});
		
			$('#hlist ._cond ._R').last().hover(function(){
   				$(this).parent().addClass("_drughover");
  			},function(){
   				$(this).parent().removeClass("_drughover");
   			}).click(function(){
      			$(this).parent().remove();			
   			});

 		$('input[name=pmhxauto]').val('');  
   
   }).css({'font-size':'12px','padding-top':'2px','padding-bottom':'1px'});
 	$('input[name=pmhxauto]').autocomplete(
    {
			source: "http://" + HOST + "/index.php?act=ajax&type=nursing",
			minLength: 4,
			select: function(e,ui){

		$('input[name=pmhxauto]').val('');
		_rxChanged = 1;
		$('#hlist').append(function(){
			_s = '<span class="_cond">';
			_e = '</span>';
			_name	= ui.item.label;
			_id		= '<input value="'+ ui.item.value +'" type="hidden" name="pmhx">';
			_nameid	= '<input value="'+ ui.item.label +'" type="hidden" name="pmhxname">';
			_remove = '<a class="_R" href="#">✪</a>';
			return (_s + _name + _id + _nameid + _remove + _e);
		});
		
			$('#hlist ._cond ._R').last().hover(function(){
   				$(this).parent().addClass("_drughover");
  			},function(){
   				$(this).parent().removeClass("_drughover");
   			}).click(function(){
      			$(this).parent().remove();			
   			});




				return false;
			}
	});				
					
					},
					activehx:	function() {
					
 $("#activecondAddButton").button({icons:{primary: "ui-icon-plus"}}).click(function(){

		_rxChanged = 1;
		$('#ahlist').append(function(){
			_s = '<span class="_cond">';
			_e = '</span>';
			_name	= $('input[name=activehxauto]').val();
			_id		= '<input value="" type="hidden" name="acthx">';
			_nameid	= '<input value="'+ $('input[name=activehxauto]').val() +'" type="hidden" name="acthxname">';
			_remove = '<a class="_R" href="#">✕</a>';
			return (_s + _name + _id + _nameid + _remove + _e);
		});
		
			$('#ahlist ._cond ._R').last().hover(function(){
   				$(this).parent().addClass("_drughover");
  			},function(){
   				$(this).parent().removeClass("_drughover");
   			}).click(function(){
      			$(this).parent().remove();
      			return false;
   			});

 		$('input[name=activehxauto]').val('');  
   
   }).css({'font-size':'12px','padding-top':'2px','padding-bottom':'1px'});
 $('input[name=activehxauto]').autocomplete(
    {
			source: "http://" + HOST + "/index.php?act=ajax&type=medic",
			minLength: 4,
			select: function(e,ui){

		$('input[name=activehxauto]').val('');
		_rxChanged = 1;
		$('#ahlist').append(function(){
			_s = '<span class="_cond">';
			_e = '</span>';
			_name	= ui.item.label;
			_id		= '<input value="'+ ui.item.value +'" type="hidden" name="acthx">';
			_nameid	= '<input value="'+ ui.item.label +'" type="hidden" name="acthxname">';
			_remove = '<a class="_R" href="#">✕</a>';
			return (_s + _name + _id + _nameid + _remove + _e);
		});
		
			$('#ahlist ._cond ._R').last().hover(function(){
   				$(this).parent().addClass("_drughover");
  			},function(){
   				$(this).parent().removeClass("_drughover");
   			}).click(function(){
      			$(this).parent().remove();			
   			});




				return false;
			}
	});					
					
					}	
				
		},
		name:			function(id) {
		
			return trak.fn.toTitleCase($('#_pn'+id).find('dt').html());
		
		},
		toTitleCase:	function(str) {

			return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});

		},
		loginThrobberOn:	function() {
			loginThrobberTimeout = setTimeout(function(){
				$('#login-throbber').show();
			},500);
		},
		loginThrobberOff:	function() {
			clearTimeout(loginThrobberTimeout);
		}

	},
	buttons:		{
	
				login:		{

							Login:    function() {
										trak.fn.loginThrobberOn();
										__PW = $("#formLogin input[name=pw]").val();
										$.ajax({

											data:    	{
															act:'dologin',
															_pw:Aes.Ctr.encrypt(__PW,__PW,256)
														},
											success:	function(data) {
															$("#formLogin").append(data);
														}

										});
								
						}

						},
				add:		{

						"↻":	function()	{
                    			
                    			$("#addPat #id").val("0");
                    			$("#addPat #name").attr("disabled", false).css({opacity:1}).val("");
								$("#addPat #dob").attr("disabled", false).css({opacity:1}).val("");
								$("#addPat #pas").attr("disabled", false).css({opacity:1}).val("");
								$( "#addPat #patSex0" ).button( "option", "disabled", false ).attr('checked', false).button("refresh");
								$( "#addPat #patSex1" ).button( "option", "disabled", false ).attr('checked', false).button("refresh");
                    			
                    			},
                    	Add:    function()	{
                    				
									
									// Unused (yet) SBARs SBARb SBARa SBARr
									// destSite destWard xdestBedx nBed nBedNum
									
									if ($("#addPat").validationEngine('validate')) {

										$(".ui-dialog-buttonpane button:contains('Add')").button("disable");
										if ($('#addPat input[name=nBed]:checked').val() == 0) {
 										var destBed = 0;
 										} else {
 										var destBed = $("#addPat #nBedNum").val();
 										};
 										$.ajax({

										data:    ({
													act:	 "dbAddVisit",
													id:		 $("#addPat #id").val(),
													pas:	 $("#addPat #pas").val(),
													_name:	 Aes.Ctr.encrypt($("#addPat #name").val(),__PW,256),
													dob:	 $("#addPat #dob").val(),
													site:	 $("#addPat #site").val(),
													gender:  $('#addPat input[name=gender]:checked').val(),
													reftype: $('#addPat input[name=reftype]:checked').val(),
													reg: 	 $("#addPat #patReg").val(),
													source:  $('#addPat input[name=source]:checked').val(),
													destSite:$('#addPat input[name=destSite]:checked').val(),
													destWard:$('#addPat input[name=destWard]:checked').val(),
													destBed: destBed,
													SBARs:	$('#addPat textarea[name=SBARs]').val(),
													SBARb:	$('#addPat textarea[name=SBARb]').val(),
													SBARr:	$('#addPat textarea[name=SBARr]').val(),
													ews:	$("#addPat input[name=ews]:checked").val(),
													dv:		$("#addPat input[name=dv]:checked").val(),
													consoc:	$('#addPat #_patient-consultants-oc-code').val(),
													_pw:	Aes.Ctr.encrypt(__PW,__PW,256)
												 }),
										success: function(data){

//alert(data);
													trak.refresh(sID,wID,fID,lID);
													trak.dialogFinish();

													
																													
															//dialogClose doesn't work here for some reason
															//$("#dialog").dialog("destroy").remove();

															}
															
									}); // $.ajax
									
									} else
									{
										window.setTimeout(function(){$('#addPat').validationEngine('hideAll')}, 6000);
									}; // validationEngine
                    			}
                    			
                    	},
                move:		{

                    			Move:    function() {
                
                if ($("#movePat").validationEngine('validate')) {
                
					var destBed = $("#movePat #nBedNum").val();
					if ($('#movePat input[name=nBed]:checked').val() == 0) 		{ var destBed = 0; };
					if ($('#movePat input[name=nBed]:checked').val() == 127)	{ var destBed = 127; };

									$.ajax({
										data:    ({
													act:	 	"dbMovePat",
													movetype:	0,
													id:			$("#movePat input[name=id]").val(),
													destSite:  	$('#movePat input[name=destSite]:checked').val(),
													destWard:  	$('#movePat input[name=destWard]:checked').val(),												
													destBed:  	destBed
													
												 }),
										success: function(data){

											trak.refresh(sID,wID,fID,lID);
                    						$("#dialog").dialog("destroy").remove(); //dialogClose(dialog);
															}
									}); // $.ajax
                
					}
					else
					{
						window.setTimeout(function(){$('#movePat').validationEngine('hideAll')}, 6000);
					}; // validationEngine

                },
                    			Predict: function() {
                
                if ($("#movePat").validationEngine('validate')) {


					var destBed = $("#movePat #nBedNum").val();
					if ($('#movePat input[name=nBed]:checked').val() == 0) 		{ var destBed = 0; };
					if ($('#movePat input[name=nBed]:checked').val() == 127)	{ var destBed = 127; };
 										
									$.ajax({

										data:    ({
													act:	 	"dbMovePat",
													movetype:	1,
													id:			$("#movePat input[name=id]").val(),
													destSite:  	$('#movePat input[name=destSite]:checked').val(),
													destWard:  	$('#movePat input[name=destWard]:checked').val(),												
													destBed:  	destBed
													
												 }),
										success: function(data){

															trak.refreshRow($("#movePat input[name=id]").val());
															$("#dialog").dialog("destroy").remove();

															}
									}); // $.ajax
                
            	}
            	else
				{
					window.setTimeout(function(){$('#movePat').validationEngine('hideAll')}, 6000);
				}; // validationEngine
                
                
                
                    			}            			

                  		},
                edit:		{
 
                    			Alter:    function() {
                
					if ($("#editPat").validationEngine('validate')) {

									if (  $('#editPat input[name=nBed]:checked').val() == 0 ) {
 										var destBed = 0;
 										}
 										else
 										{
 										var destBed = $("#editPat #nBedNum").val();
 										};
 										
									$.ajax({
										data:    ({
													act:	 	"dbEditPat",
													id:			$("#editPat input[name=id]").val(),
													reftype:  	$('#editPat input[name=reftype]:checked').val(),
													destSite:  	$('#editPat input[name=destSite]:checked').val(),
													destWard:  	$('#editPat input[name=destWard]:checked').val(),												
													triage:		$('#editPat input[name=triage]:checked').val(),
													ews:		$("#editPat input[name=ews]").val(),
													destBed:  	destBed
													
												 }),
										success: function(data){

													trak.refresh(sID,wID,fID,lID);
													$("#dialog").dialog("destroy").remove();
			
										}

									}); // $.ajax
                
                	} else
					{
									window.setTimeout(function(){$('#editPat').validationEngine('hideAll')}, 6000);
					}; // validationEngine
                
                
                
                    			}
                    		 },
                viewnotes:	{
                				OK:	function()	{
                								trak.dialogFinish();
                								}
                			},
				job:		{

Save: function() {
 if ($("#addJob").validationEngine('validate')) {
		$(".ui-dialog-buttonpane button:contains('Save')").button("disable");

 		$.ajax({

										data:    ({
													act:	"dbAddJob",
													data:	Aes.Ctr.encrypt(  $("#addJob").serialize()  ,__PW,256),
													result:	Aes.Ctr.encrypt(  $('#addJobResult textarea[name=event_result]').val()  ,__PW,256)

													
												 }),
										success: function(data){

											//alert(data);
											trak.refreshRow($("#addJob input[name=vID]").val());
											$("#dialog").dialog("destroy").remove();

															}
															
									}); // $.ajax

 } else
 {
	$('#addJob').show();
	$('#addJobResult').hide();
	window.setTimeout(function(){$('#addJob').validationEngine('hideAll')}, 6000);
 }; // validationEngine


	}

},
				notes:		{

                    			Save:    function() {
                    				

									if ($("#formAddNote").validationEngine('validate')) {
									$(".ui-dialog-buttonpane button:contains('Save')").button("disable");
									$.ajax({
										data:    ({
													act:	 		"dbAddNote",
													formID_id:		 $("#formAddNote input[name=formID_id]").val(),
													formID_visitid:  $("#formAddNote input[name=formID_visitid]").val(),
													formID_refid:	 $("#formAddNote input[name=formID_refid]").val(),
													formID_author:	 $("#formAddNote input[name=formID_author]").val(),
													formID_bleep:	 $("#formAddNote input[name=formID_bleep]").val(),
													formID_role:	 $("#formAddNote input[name=formID_role]:checked").val(),
													formID_note:	 Aes.Ctr.encrypt(  $("#formAddNote textarea[name=formID_note]").val()  ,__PW,256)
												 }),
										success: function(data){

//alert(data);

										vid = $("#formAddNote input[name=formID_visitid]").val();
															// location.reload();
															$("#patBoxSubID_" + vid ).hide();
															
// Update note count icon
// if ( $("#noteImg_"+vid+"b").length )
// {
// 		if ($("#formAddNote input[name=formID_id]").val() == "") {
// 			lBadge = $('#noteImg_'+vid+'b #Badge').html();
// 			$('#noteImg_'+vid+'b #Badge').html(   Number(lBadge)+1   );
// 		}
// }
// else
// {
// 
// 	$('#noteTD_'+vid+' ._notes').prepend('<div rel="'+vid+'" id="noteImg_'+vid+'b" class="noteImg"><img id="noteImg_'+vid+'" width="38" height="38" src="gfx/note_pad.png" /></div>');
// 	$('#noteImg_'+vid+'b').badger('1');
// 							
// };
// Update note count icon
if ( $('.patient-notes').attr('data-number') != '0' )
{
		
		currentNumber = $('.patient-notes').attr('data-number');
		$('.patient-notes').attr('data-number',Number(currentNumber)+1).badger($('.patient-notes').attr('data-number'));
		
}
else
{

		$('.patient-notes').button('option','label','Notes&nbsp;&nbsp;').attr('data-number',1).badger($('.patient-notes').attr('data-number'));				

};							

															//dialogClose doesn't work here for some reason
													$("#dialog").dialog("destroy").remove();
															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
											} else
									{
										window.setTimeout(function(){$('#formAddNote').validationEngine('hideAll')}, 6000);
									}; // validationEngine
                    			}
                    		 },
				refer:		{
				
							create:		{
	Save:    function() { 

 if ($("#formAddRef").validationEngine('validate')) {
		$(".ui-dialog-buttonpane button:contains('Save')").button("disable");
		$.ajax({
			data:    ({
						act:	 		"dbAddRef",
						formID_id:		 $("#formAddRef input[name=formID_id]").val(),
						formID_noteid:	 $("#formAddRef input[name=formID_noteid]").val(),
						formID_visitid:  $("#formAddRef input[name=formID_visitid]").val(),
						formID_who:		 $("#formAddRef input[name=formID_who]:checked").val(),
						formID_status:	 $("#formAddRef input[name=formID_status]").val(),
						formID_rtime:	 $("#formAddRef input[name=formID_rtime]").val(),
						formID_note:	 Aes.Ctr.encrypt(  $("#formAddRef textarea[name=formID_note]").val()  ,__PW,256),
						formID_author:	 $("#formAddRef input[name=formID_author]").val(),
						formID_bleep:	 $("#formAddRef input[name=formID_bleep]").val()
					 }),
			success: function(data, textStatus, jqXHR){

// //alert(data);
// var trakRetObj = jQuery.parseJSON(data);
// if (trakRetObj.id != undefined) {
//  trak.visRef[trakRetObj.vid].push(trakRetObj.id);
// //$("#patBoxRefID_" + trakRetObj.vid + " ._refs").append('<a id="refHREF_'+trakRetObj.id+'" class="refUpdate" href="http://' + HOST + '/index.php?act=formUpdateRef&id='+ trakRetObj.id +'&amp;type='+ trakRetObj.who +'&amp;vid='+trakRetObj.vid+'" data-form="http://' + HOST + '/index.php?act=formUpdateRef&id='+ trakRetObj.id +'&amp;vid='+trakRetObj.vid+'"><img id="refImg_'+ trakRetObj.id +'" width="38" height="38" src="gfx/'+ trakRetObj.icon +'" /></a>');												
// $("#patBoxRefID_" + trakRetObj.vid + " ._refs").append(
// 
// 	'<div id="refHREF_'+trakRetObj.id+
// 	'" class="patient-referral"' + 
// 	' data-refid="'+ trakRetObj.id +
// 	'" data-type="'+ trakRetObj.who +
// 	'" data-visitid="'+trakRetObj.vid+
// 	'"><img id="refImg_'+ trakRetObj.id +
// 	'" width="38" height="38" src="gfx/'+ trakRetObj.icon +
// 	'" /></div>');												
// //genBubble(trakRetObj.id,trakRetObj.vid);
// //$("#tCount_" + trakRetObj.vid ).countdown({serverSync: serverTime, since: new Date(),format: "HMS", layout: "➘ {hn}{sep}{mnn}{sep}{snn}"});
// } else {
// $("#refImg_"+ $("#formAddRef input[name=formID_id]").val()).attr("src","gfx/" + trakRetObj.icon);
// $("#refImg_"+ $("#formAddRef input[name=formID_id]").val()).SetBubblePopupInnerHtml($("#formAddRef textarea[name=formID_note]").val());
//  };
// //dialogClose doesn't work here for some reason
// $("#dialog").dialog("destroy").remove();


							trak.refreshRow($("#formAddRef input[name=formID_visitid]").val());
												$("#dialog").dialog("destroy").remove();

			}
		}); // $.ajax
		} else
									{
										window.setTimeout(function(){$('#formAddRef').validationEngine('hideAll')}, 6000);
									}; // validationEngine
	}
 },
 							edit:		{


	Save:    function() { 
		$(".ui-dialog-buttonpane button:contains('Save')").button("disable");
//						formID_noteHx:  $("#formUpdateRef textarea[name=formID_noteHx]").val(),

		$.ajax({
			data:    ({
						act:	 		"dbUpdateRef",
						formID_refid:	$("#formUpdateRef input[name=formID_refid]").val(),
						formID_hxid:    $("#formUpdateRef input[name=formID_hxid]").val(),
						formID_dxid:    $("#formUpdateRef input[name=formID_dxid]").val(),

						formID_noteDx:  Aes.Ctr.encrypt(  $("#formUpdateRef textarea[name=formID_noteDx]").val()  ,__PW,256),
						status:			$("#formUpdateRef input[name=status]:checked").val(),
						vid:			$("#formUpdateRef input[name=formID_vid]").val(),
						zwho:			$("#formUpdateRef input[name=zwho]").val(),
						
						author:			$("#formUpdateRef input[name=formID_author]").val(),
						bleep:			$("#formUpdateRef input[name=formID_bleep]").val(),
						
						Hxauthor:		$("#formUpdateRef input[name=formID_Hxauthor]").val(),
						Hxbleep:		$("#formUpdateRef input[name=formID_Hxbleep]").val(),
						Hxnote:			Aes.Ctr.encrypt(  $("#formUpdateRef textarea[name=formID_refnote]").val()  ,__PW,256)
						
					 }),
			success: function(data, textStatus, jqXHR){

//alert(data);

diaRefID  = $("#formUpdateRef input[name=formID_refid]").val();
diaVisID  = $("#formUpdateRef input[name=formID_vid]").val();
diaStatID = $("#formUpdateRef input[name=status]:checked").val();

switch(diaStatID) {
case '1':
	$("#refImg_" + diaRefID).removeClass('_R').css({opacity:1});
	break;
case '2':
	$("#refImg_" + diaRefID).addClass('_R').css({opacity:1});
	break;
case '4':
 	$("#refImg_" + diaRefID).addClass('_R').css({opacity:0.4}); 
	break;

};


if (  $("#formUpdateRef input[name=zwho]").val() == 1 ) { // Doctor
	$("#triage_" + diaVisID).hide();		   // Kill triage icon
	$("#tCount_" + diaVisID).countdown('destroy');
	$("#tCount_" + diaVisID).empty();
};
$("#dialog").dialog("destroy").remove();




			}
		}); // $.ajax

	}
	

	
	
	
	
 },
 							han:		{


	Save:    function() { 
//        x   x   x      x       x     x      x          x                          x
//formID act id noteid visitid status hx reqaction HANcompleteDate HANcompleteTime edd (expiry 10am)
 if ($("#formAddRef").validationEngine('validate')) {
		$.ajax({
			data:    ({


						act:	 			"dbAddRef",
						id:		 			$("#formAddRef input[name=formID_id]").val(),
						noteid:	 			$("#formAddRef input[name=formID_noteid]").val(),
						visitid: 		 	$("#formAddRef input[name=formID_visitid]").val(),
						who:				127,
						status:	 			$("#formAddRef input[name=formID_status]").val(),
						hx:					$("#formAddRef textarea[name=formID_hx]").val(),
						reqaction:			$("#formAddRef textarea[name=formID_reqaction]").val(),
						HANcompleteDate:	$("#formAddRef input[name=HANcompleteDate]:checked").val(),
						HANexpireDate:		$("#formAddRef input[name=edd]:checked").val(),
						HANcompleteTime:	$("#formAddRef input[name=HANcompleteTime]").val()
						
					 }),
			success: function(data, textStatus, jqXHR){



//alert(data);

clearInterval(clockMinutes);
clearInterval(clockSeconds);
clearInterval(clockHours);

// Add lightbulb icon to indicate HAN job 


$('#patBoxID_' + $("#formAddRef input[name=formID_visitid]").val() + ' ._info').html('<img src="gfx/ktip_1453_128.png" width="32" height="32" id="han_'+  $("#formAddRef input[name=formID_visitid]").val()  +'" />');


// Add one to HAN button badge
lBadge = $('#action-han #Badge').html();
if (lBadge == null) {
 $('#action-han').badger('1');
}
else
{
 $('#action-han #Badge').html(Number(lBadge)+1);
};


//dialogClose doesn't work here for some reason
$("#dialog").dialog("destroy").remove();





			},
			error: function(jqXHR, textStatus, errorThrown) {
				updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
			}
		}); // $.ajax
 		} else
									{
										window.setTimeout(function(){$('#formAddRef').validationEngine('hideAll')}, 6000);
									}; // validationEngine
	}
 },
 							pharma:		{

Print: function(){

//alert($("#drugList").serialize());
//alert($("#formEditRx textarea[name=note_rec]").val());
},

 
 Cancel: function(){
 $("#dialog").dialog("destroy").remove();
 },
 Save:    function() {
                    				

									//if ($("#formEditRx").validationEngine('validate')) {
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
													act:	 "dbUpdateRx",
													data:	 $("#drugList").serialize(),
													pid:	$("#formEditRx input[name=pid]").val(),
													vid:	$("#formEditRx input[name=vid]").val(),
													noterec: $("#drugList textarea[name=note_rec]").val(),
													notedisc: $("#drugList textarea[name=note_disc]").val(),
													nid:$("#drugList input[name=nid]").val()
													
												 }),
										success: function(data){
//alert(data);
_rxChanged = 0;
											$("#dialog").dialog("destroy").remove();

															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
											//} else
									//{
									//	window.setTimeout(function(){$('#formEditRx').validationEngine('hideAll')}, 6000);
									//}; // validationEngine
                    			}
                    		 },
							nurse:		{

 Cancel: function(){

 $("#dialog").dialog("destroy").remove();
 
 
 },
 Save:    function() {
                    				


									//if ($("#formEditRx").validationEngine('validate')) {
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
										
													act:	"dbEditNursing",
													data:	$("#formEditNursing").serialize(),
													pid:	$("#formEditNursing input[name=pid]").val(),
													vid:	$("#formEditNursing input[name=vid]").val(),
													pc:		$("#formEditNursing textarea[name=pc]").val(),
													wd:		$("#formEditNursing textarea[name=wd]").val(),
													plan:	$("#formEditNursing textarea[name=plan]").val(),
													jobs:	$("#formEditNursing textarea[name=jobs]").val(),
													
													ews:	$("#formEditNursing input[name=ews]:checked").val(),
													triage:	$("#formEditNursing input[name=triage]:checked").val(),
													resus:	$("#formEditNursing input[name=resus]:checked").val(),
													alert:	$("#formEditNursing input[name=alert]").val(),
													nid:	$("#formEditNursing input[name=nid]").val()

													
												 }),
										success: function(data){
//alert(data);
//_rxChanged = 0;
											//trakRefresh(sID,wID,fID,lID);
											trak.refreshRow($("#formEditNursing input[name=vid]").val());
											$("#dialog").dialog("destroy").remove();

															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
											//} else
									//{
									//	window.setTimeout(function(){$('#formEditRx').validationEngine('hideAll')}, 6000);
									//}; // validationEngine
                    			}
                    		 },
							medic:		{

 Cancel: function(){

 $("#dialog").dialog("destroy").remove();
 
 
 },
 Save:    function() {
                    				


									//if ($("#formEditRx").validationEngine('validate')) {
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
										
													act:	"dbEditMedic",
													data:	$("#formEditMedic").serialize(),
													pid:	$("#formEditMedic input[name=pid]").val(),
													vid:	$("#formEditMedic input[name=vid]").val(),
													pc:		$("#formEditMedic textarea[name=pc]").val(),
													wd:		$("#formEditMedic textarea[name=wd]").val(),
													plan:	$("#formEditMedic textarea[name=plan]").val(),
													jobs:	$("#formEditMedic textarea[name=jobs]").val(),
													
													ews:	$("#formEditMedic input[name=ews]:checked").val(),
													triage:	$("#formEditMedic input[name=triage]:checked").val(),
													resus:	$("#formEditMedic input[name=resus]:checked").val(),
													alert:	$("#formEditMedic input[name=alert]").val(),
													nid:	$("#formEditMedic input[name=nid]").val()

													
												 }),
										success: function(data){
//alert(data);
//_rxChanged = 0;
											//trakRefresh(sID,wID,fID,lID);
											trak.refreshRow($("#formEditMedic input[name=vid]").val());
											$("#dialog").dialog("destroy").remove();

															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
											//} else
									//{
									//	window.setTimeout(function(){$('#formEditRx').validationEngine('hideAll')}, 6000);
									//}; // validationEngine
                    			}
                    		 }
 
 
 
 
 							},
 				beds:		{}
	
				},
	support:		function() {
	
$(".clickSite").live('click',function(){
//Add patieint window
	var siteID = $(this).val();
//	if (siteID != 99) {
	 // ajax stuff for form update

            
							$.ajax({
								type:    "POST",
								url:     "http://" + HOST + "/index.php",
								data:    ({
											act:	"ajax",
											type:	"wardlist",
											site:	siteID,
											ward:	trak.clickRef[siteID]
											
										 }),
								success: function(data){
								//alert(data);
								$('#siteWardOptions').html(data).buttonset();
								
								},
					
								error: function(jqXHR, textStatus, errorThrown) {
									updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
								}
							}); // $.ajax
     
     // end ajax form update
//     } else
//     {
//     };
	
});
$(".clickSiteB").live('click',function(){
//Alter patient window
	var siteID = $(this).val();
//	if (siteID != 99) {
	 // ajax stuff for form update

            
							$.ajax({
								type:    "POST",
								url:     "http://" + HOST + "/index.php",
								data:    ({
											act:	"ajax",
											type:	"wardlistB",
											site:	siteID,
											ward:	trak.clickRef[siteID]
											
										 }),
								success: function(data){
								//alert(data);
								$('#siteWardOptions').html(data).buttonset();
								
								},
					
								error: function(jqXHR, textStatus, errorThrown) {
									updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
								}
							}); // $.ajax
     
     // end ajax form update
//     } else
//     {
//     };
	
});
$(".clickSiteC").live('click',function(){
//Alter patient window
	var siteID = $(this).val();
//	if (siteID != 99) {
	 // ajax stuff for form update

            
							$.ajax({
								type:    "POST",
								url:     "http://" + HOST + "/index.php",
								data:    ({
											act:	"ajax",
											type:	"wardlistC",
											site:	siteID,
											ward:	trak.clickRef[siteID]
											
										 }),
								success: function(data){
								//alert(data);
								$('#siteWardOptions').html(data).buttonset();
								
								},
					
								error: function(jqXHR, textStatus, errorThrown) {
									updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
								}
							}); // $.ajax
     
     // end ajax form update
//     } else
//     {
//     };
	
});
$(".clickWard").live('click',function(){
	trak.clickRef[$("#addPat input[name=destSite]:checked").val()] = $(this).val();
});
$(".clickWardB").live('click',function(){
	trak.clickRef[$("#editPat input[name=destSite]:checked").val()] = $(this).val();
});
$(".clickWardC").live('click',function(){
	trak.clickRef[$("#movePat input[name=destSite]:checked").val()] = $(this).val();
});
$(".clickBed").live('click',function(){

if (  $('#addPat input[name=nBed]:checked').val() == 0 ) {
 $("#addPat #nBedNum").attr("disabled", true).css({opacity:0.6}).removeClass('validate[required,custom[integer]]');
 }
 else
 {
 $("#addPat #nBedNum").attr("disabled", false).css({opacity:1}).addClass('validate[required,custom[integer]]');
 };
});
$(".clickBedB").live('click',function(){

if (  $('#editPat input[name=nBed]:checked').val() == 0 ) {
 $("#editPat #nBedNum").attr("disabled", true).css({opacity:0.6}).removeClass('validate[required,custom[integer]]');
 }
 else
 {
 $("#editPat #nBedNum").attr("disabled", false).css({opacity:1}).addClass('validate[required,custom[integer]]');
 };
});
$(".clickBedC").live('click',function(){

if (  ($('#movePat input[name=nBed]:checked').val() == 0) || ($('#movePat input[name=nBed]:checked').val() == 127)) {
 $("#movePat #nBedNum").attr("disabled", true).css({opacity:0.6}).removeClass('validate[required,custom[integer]]');
 }
 else
 {
 $("#movePat #nBedNum").attr("disabled", false).css({opacity:1}).addClass('validate[required,custom[integer]]');
 };
});
$(".bedTrafficLight").live('change',function(){

	$.ajax({
		type:    "POST",
		url:     "http://" + HOST + "/index.php",
		data:    ({
					act:	"ajax",
					type:	"bedTrafficLight",
					site:	$("#movePat input[name=destSite]:checked").val(),
					ward:	$("#movePat input[name=destWard]:checked").val(),
					bed:	$("#movePat input[name=nBedNum]").val()					
				 }),
		success: function(data){
			$("#trafficlight").attr("src","gfx/" + data);
										},
		error: function() {
			// Fail quietly
			$("#trafficlight").attr("src","gfx/tl_amber.png");
		}
	}); // $.ajax

});
$(".bedTrafficLightB").live('change',function(){

	$.ajax({
		type:    "POST",
		url:     "http://" + HOST + "/index.php",
		data:    ({
					act:	"ajax",
					type:	"bedTrafficLight",
					site:	$("#editPat input[name=destSite]:checked").val(),
					ward:	$("#editPat input[name=destWard]:checked").val(),
					bed:	$("#editPat input[name=nBedNum]").val()					
				 }),
		success: function(data){
			$("#trafficlight").attr("src","gfx/" + data);
										},
		error: function() {
			// Fail quietly
			$("#trafficlight").attr("src","gfx/tl_amber.png");
		}
	}); // $.ajax

});
$(".hdrFilter").qtip({

	events: 	{

      show: function(event, api) {
      if ($('#hdrFilterList').html().length == 0)
      {
      // don't show the filter list qtip if it's empty
         event.preventDefault();
         
    	};
      
      }
      
      
      },
	hide:		{
      event: 'unfocus'
    },
	show:		{
	
		event:	'click',
		xeffect:	function() { $(this).show("slide", { direction: "right" }, 200); }
	},	
	content:	{
				text: $('#hdrFilterList')
				},
	position:	{
				viewport: $(window),
				my: 'top center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				}
      			}
});
$(".hdrSelWard").qtip({
	hide:		 {
      event: 'unfocus'
    },
	show:		'click',
	hide: 		{
      event: 'unfocus'
    },
	content:	{
				text: $('#hdrWardList')
				},
	position:	{
				viewport: $(window),
				my: 'top center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				}
      			}
});
$('.hdrSelSite').live('click',function(){
	$( ".hdrSelWard" ).button( "option", "label", '<img src="gfx/fbThrobber.gif" />' );
	$.ajax({
		data:    	({
						act:	"ajax",
						type:	"hdrwardlist",
						site:	$("#selSite input[name=selectSite]:checked").val()
				 	}),
		success:	function(data){
						$('#hdrWardList').html(data);
						$('#hdrWardList div').button().css('font-size','14px');
					}
	});
});

$('.hdrWideButtons').live('click',function(){
	wID   = $(this).attr("data-wid");
	wName = $(this).text();
	sID   = $("#selSite input[name=selectSite]:checked").val();
	$( ".hdrSelWard" ).button( "option", "label", wName );
	$(".hdrSelWard").qtip('hide');
    trak.refresh(sID,wID,0,0);
	$.ajax({
		data:    	({
						act:	"ajax",
						type:	"hdrfilterlist",
						site:	sID,
						ward:	wID
				 	}),
		success:	function(data){
		if(data.length == 1){
			// No filters returned
			$('.hdrFilter').fadeOut('fast');
			$('#hdrFilterList').html(''); // used later to hide the qtip bubble
		}else{
						$('#hdrFilterList').html(data);
						$('#hdrFilterList .hdrWideButtons2').button().css('font-size','14px');
						$( ".hdrFilter" ).button( "option", "label", "All" );
						$('.hdrFilter').fadeIn('fast');
			};
					},
		error: 		function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					}
	});
}); // qTip for Ward
$('.hdrWideButtons2').live('click',function(){
	fID   = $(this).attr("data-fid");
	fName = $(this).attr('data-text');
	$( ".hdrFilter" ).button( "option", "label", fName );
	$(".hdrFilter").qtip('hide');
    trak.refresh(sID,wID,fID,0);

}); // qTip for Filters
$('.hdrWideButtons3').live('click',function(){
	//lID   = $(this).attr("rel");
	lID   = $(this).attr("data-list");
	//lName = $(this).find('.ui-button-text').html();
	lName = $(this).attr('data-name');
	$( ".hdrFilter" ).button( "option", "label", lName );
	$("#action-lists").qtip('hide');
	$("#lists-other").qtip('hide');
	$("#lists-byconsultant").qtip('hide');
	$('.hdrFilter').fadeIn('fast');
    trak.refresh(sID,wID,0,lID);




});
$('.hdrWideButtons4').live('click',function(){
	lID   = $(this).attr("rel");
	fName = $(this).find('.ui-button-text').html();
	lName = $('#dPW'+lID).attr('value');
	$("#action-pathways").qtip('hide'); // otherwise it hangs around too long
 var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialog.dialog({
  title: fName,
  close: function(){dialogClose(dialog);},
  width:800,
  height:600,
  modal: true,
  open: function(){  	
    var fp = new FlexPaperViewer(	
		 'lib/flexpaper/FlexPaperViewer',
		 'dialog', { config : {
		 SwfFile : escape("http://" + HOST + "/pathways/"+lName),
		 Scale : 1.2, 
		 ZoomTransition : 'easeOut',
		 ZoomTime : 0.5,
		 ZoomInterval : 0.2,
		 FitPageOnLoad : false,
		 FitWidthOnLoad : true,
		 FullScreenAsMaxWindow : false,
		 ProgressiveLoading : true,
		 MinZoomSize : 0.2,
		 MaxZoomSize : 5,
		 SearchMatchAll : false,
		 InitViewMode : 'Portrait',
		 PrintPaperAsBitmap : false,
		 
		 ViewModeToolsVisible : true,
		 ZoomToolsVisible : true,
		 NavToolsVisible : true,
		 CursorToolsVisible : true,
		 SearchToolsVisible : true,
		
		 localeChain: 'en_US'
		 }});
  },
  xopen: function(){
  
  var myPDF = new PDFObject({
  url: "http://" + HOST + "/pathways/"+lName,
  pdfOpenParams: {
    navpanes: 1,
    statusbar: 0,
    view: "FitH",
    pagemode: "thumbs"
  }
}).embed("dialog");
  
  
  
  }
 }).css('overflow','hidden');
 
});
$('.hdrWideButtons5').live('click',function(){

	$(".patient-documents").qtip('hide');
 _name = trak.fn.name($(this).attr('data-visitid'));
 _desc = $(this).attr('data-description');
 trak.dialogInit();
 dialog.dialog({
  title: 'Working...',
  close: function(){
  	trak.dialogFinish();
  },
  width:800,
  height:600,
  modal: true
 }).load(trak.url,{
 
 	vid:	$(this).attr('data-visitid'),
 	act:	'document',
 	type:	$(this).attr('data-type')
 
 },function(){
 	dialog.dialog("option","title", _desc + ' for ' + _name); 
 });
 return false;
}); // qTip for Documents
$('.hdrWideButtons7').live('click',function(){

_id = $(this).attr('data-code');
_name = $(this).attr('data-name');

//alert(_id);

$('#_patient-consultants-oc-code').val(_id);
$('#_patient-consultants-oc').button('option','label',_name).button('refresh');
$(".patient-consultants-oc").qtip('hide');

}); // qTip for On-call consultants
$('.hdrWideButtons8').live('click',function(){
	fID   = $(this).attr("data-code");
	fName = $(this).attr('data-name');
	$( ".hdrFilter" ).button( "option", "label", fName );
	$("#action-lists").qtip('hide');
	$("#lists-other").qtip('hide');
	$("#lists-byconsultant").qtip('hide');
    trak.refresh(sID,wID,fID,402);

}); // qTip for consultant filter


$('.note-jump').live('click',function(){

	_jump = '#' + $(this).attr('data-jump'); 
 	$('.notePaper').scrollTo(_jump, '100%', {onAfter: function(){
 		$(_jump).effect("highlight", {color:'#FF0000'}, 'slow');
 	}});
 
 });
$('.note-top').live('click',function(){

 	$('.notePaper').scrollTo(0,0);
 
 });



	
	},
	actions:		function() {
	
			$("#action-lists").button({icons:{primary:"ui-icon-clipboard"},text:true}).click(function(event){
				$(this).qtip({
	overwrite:	true,
	hide: {
      event: 'unfocus'
    },
	show: 		{
         event: event.type,
         ready: true
      },
	content:	{
      text: '<div id="'+trak.dialog+'"><img src="gfx/fbThrobber.gif" /></div>',
      ajax: {
         url: trak.url,
         type: 'POST',
         data: 	{
    					act:	"ajax",
    					type:	"lists-sub",
						site:	sID,
						ward:	wID,
						filter: fID     		
         		}, 
         success:	function(data, status) {
         	this.set('content.text', data);
  			$("#lists-sub div").css({"font-size":"14px","width":"200px","text-align":"left"}).button({icons:{primary:"ui-icon-star"}});
			$('.hdrWideButtons3',$('#lists-sub')).each(function(){
				if ($(this).attr('data-number') != '0') {
					$(this).badger($(this).attr('data-number'));
				};
			});
			$("#action-lists").qtip('reposition');
			$('#makeFlash').addClass('_fl');
         }



      }
  				 },
	position:	{
				viewport: $(window),
				my: 'top center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#lists-sub .hdrWideButtons3").css('width') +8  }
      			}
},event);
			});
			$("#action-diary").button({icons:{primary:"ui-icon-calendar"},text:false}).click(function(){
			
 trak.dialogInit();
 dialog.dialog({
  close: function() {
  		trak.dialogFinish();
  },
  width:800,
  height:600,
  title:'Diary',
  modal: true
 }).load(trak.url,{
 
 	act:		'diary'
 
 },function(){

		scheduler.clearAll(); // needed to force site/bed/ward to update
		scheduler.init('scheduler',new Date(),"month");
		scheduler.setLoadMode("month");
		scheduler.load(trak.url + "?act=scheduler");
		var dp = new dataProcessor(trak.url + "?act=scheduler");
		dp.init(scheduler);
// 		scheduler.addEvent({
//                              
//                             start_date:		"2012-03-29",
//                             end_date:		"2012-03-29",
//                             text:			'Test',
//                             event_location:	'Glasgow'
//                                
//         });

 });
 return false;
 
});
			$("#action-pathways").button({icons:{primary:"ui-icon-document"},text:true}).click(function(event){
$(this).qtip({
	overwrite:	true,
	hide: {
      event: 'unfocus'
    },
	show: 		{
         event: event.type,
         ready: true
      },
	content:	{
      text: '<div id="'+trak.dialog+'"><img src="gfx/fbThrobber.gif" /></div>',
      ajax: {
         url: trak.url,
         type: 'POST',
         data: 	{
    					act:	"ajax",
    					type:	"pathways"
         		} 
      }
  				 },
	position:	{
				viewport: $(window),
				my: 'top center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				}
      			}
},event);
});
			$("#action-han").button({icons:{primary:"ui-icon-lightbulb"},text:true}).click(function(){
			
 trak.dialogInit();
 dialog.dialog({
  autoOpen: false,
  close: function() {
  		trak.dialogFinish();
  },
  width:540,
  height:600,
  modal: true
 }).load(trak.url,{
 
 	act:		'HANlist',
 	hansite:	sID
 
 },function(){
  dialog.parent().addClass('hanbg');
  dialog.dialog("option","title",'Hospital at Night tasks for ' + $('#hanTable').attr('data-sitename'));
  dialog.dialog("open");
 });
 return false;
 
});
			$('#action-print').click(function(){

 trak.dialogInit();
 dialog.dialog({
  title: 'Working...',
  close: function(){
  	trak.dialogFinish();
  },
  width:800,
  height:600,
  modal: true
 }).load(trak.url,{
 
 	act:		'handover',
 	site:		sID,
 	ward:		wID,
 	filter:		fID,
 	list:		lID,
 	viewType:	'google'
 
 },function(){
 	dialog.dialog("option","title",'Handover'); // for ' + $('#adeptol').attr('data-name')); 
 });
 return false;
});
			$("#action-add").button({icons:{primary:"ui-icon-plusthick"},text:true}).click(function(){

 trak.dialogInit();
 dialog.dialog({
  title: 'Add new patient',
  close: function(){
  	$('#addPat').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  width:710,
  height:450,
  modal: true,
  create:	function() {
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/user_accept.png"></div><div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Details</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Demographics</label><input type="radio" value="3" name="db" id="db3" /><label for="db3">Destination</label></div><div id="add-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
  },  
  buttons: trak.buttons.add
 }).load(trak.url,
 {
 
 	act:		'formAddPat',
 	addSite:	sID
 
 },function()
 {
  	$('#addPat #patReg').attr('disabled',true).css({opacity:0.6});
 	$("#addPat #nBedNum").attr("disabled",true).css({opacity:0.6});
// 	$("#tabs").tabs({
// 		selected:	0,
// 		select: 	function(){
// 						if ($("#addPat").validationEngine('validate'))
// 						{
// 							return true;
// 						}
// 						else
// 						{
// 							window.setTimeout(function(){$('#addPat').validationEngine('hideAll')}, 6000);
// 							return false;
// 						};		
// 					//return $("#addPat").validationEngine('validate');					
// 					}
// 	});
	$(".dialogButtons").buttonset();
	$(".patDob").datepicker({changeMonth: true,  yearRange: '-104:', dateFormat: 'dd/mm/yy', changeYear: true, minDate: '-104y', maxDate: '-0y'});
	$(".patDob").blur(function(){
		// Makes the validation bubble disappear after datePicker used (NOT USED)
		// $(".patDob").validationEngine('validateField', ".patDob");
	});
	$("#addPat #patSearch").button({icons:{primary: "ui-icon-search"}}).click(function(){  
            // ajax stuff for search
//            if ($("#addPat").validationEngine('validateField', "#pas")) {
    
							$.ajax({

								data:    ({
											act:	"ajax",
											type:	"patsearch",
											pas:	$("#addPat #pas").val()
											
										 }),
								success: function(data){
								var trakRetObj = jQuery.parseJSON(data);	
								//$("#addPat #name").val(trakRetObj.name);
								$("#addPat #name").val( Aes.Ctr.decrypt(trakRetObj.name,__PW,256) );
								$("#addPat #dob").val(trakRetObj.dob);
								$("#addPat #id").val(trakRetObj.id);
								$("#addPat #patSex" + trakRetObj.gender).attr("checked",true);

								$("#addPat #name").attr("disabled", true).css({opacity:0.6});
								$("#addPat #dob").attr("disabled", true).css({opacity:0.6});
								$("#addPat #pas").attr("disabled", true).css({opacity:0.6});
								$( "#addPat #patSex0" ).button( "option", "disabled", true ).button("refresh");
								$( "#addPat #patSex1" ).button( "option", "disabled", true ).button("refresh");
		
								
													}
													
							}); // $.ajax
							
//			} else
//			{
//				window.setTimeout(function(){$('#addPat').validationEngine('hideAll')}, 6000);
//			}; // validationEngine
     
     
     // end ajax search
     
            });
	$("#addPat input[name=pas]").focus();
	$("#addPat").validationEngine('init');
	$("#addPat").validationEngine('attach',
		{
			scroll:					false,
			validationEventTrigger:	'',
			binded:					true,
			xxxonSuccess:				function(form) {
			
			alert("OnSuccess called");
			
				if (!this.beenSubmitted) {
					this.beenSubmitted = true;
					form.submit();
				} else
				{
					alert('Sending again blocked! [TEMP MESSAGE]');
				};
			
			}
		}
	);
	$("#addPat input[name=source]").click(function(){
	 if (  $("#addPat input[name=source]:checked").val() == '1'  ) { // A&E
	 	// Demand registration time
	 	$('#addPat #patReg').attr('disabled',false).css({opacity:1});
	 	$('#addPat #patReg').addClass('validate[required,custom[trakTime]]');
	 }
	 else
	 {
	 	// Hide registration time
	 	$('#addPat #patReg').val('');
	 	$('#addPat #patReg').attr('disabled',true).css({opacity:0.6});
	 	$('#addPat #patReg').removeClass('validate[required,custom[trakTime]]');
	 };
	});
	$("#addPat input[name=patReg]").timepicker({
		setDate:		new Date()	
	});
	$('.db input[name=db]').click(function(){

				if ($(this).val() == 1)
				{	
					$('#demo').hide();
					$('#dest').hide();
					$('#info').fadeIn('fast');
				};
				if ($(this).val() == 2)
				{
					$('#info').hide();					
					$('#dest').hide();
					$('#demo').fadeIn('fast');
									
				};
				if ($(this).val() == 3)
				{
					$('#info').hide();
					$('#demo').hide();
					$('#dest').fadeIn('fast');								
				};



	 		});
	$("#_type, #_ews, #_dv").css('font-size','13px');
	$('#_patient-consultants-oc').button({icons:{primary:"ui-icon-person"}});;
 });
 return false;
});

			$('#action-beds').button({icons:{primary:"ui-icon-heart"},text:false}).click(function(){

 //alert('Filter: '+fID+' List:'+lID);
 trak.dialogInit();
 dialog.dialog({
  close: function() {
  		trak.dialogFinish();
  },
  open: function(){
  	$('.ui-button').blur();
  },
  create:	function() {
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/Notebook.png"></div><div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Notes</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Referrals and jobs</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
						  
						  
  },
  width:900,
  height:500,
  title:'Bed state',
  modal: true,
  buttons: trak.buttons.viewnotes
 }).load(trak.url,
 {
 			act:	"bedbash",
 			ssite:	sID,
 			sward:	wID

 },function(){

 });
 return false;
 });
			$('#action-search').button({icons:{primary:"ui-icon-search"},text:false}).click(function(){


$.ajax({
  url: trak.url,
  cache: false,
  data:	{act:'search'}
}).done(function( html ) {
  $(".trakPatient").before(html);
  $('input[name=search]').focus();
});



 });


  $('input[name=search]').live('keyup.autocomplete', function(){
    $(this).autocomplete({
      source: 		trak.url + '?act=dosearch&site='+ sID,
      minLength:	4,
      select:		function(e,ui){
			trak.refresh(sID,wID,ui.item.value,401);
			$( ".hdrFilter" ).button( "option", "label", 'Search' );   		
      }
    });
  });


















			$(".patient-jobs").live('click',function(){

 trak.dialogInit();
 dialog.dialog({
  title: 'Add a new job',
  close: function(){
  	$('#addJob').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  width:400,
  height:460,
  modal: true,
  open: function(){
  	$('.ui-button').blur();
  },
  create:	function() {
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/job.png"></div><div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Schedule</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Result</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
  },
  buttons: trak.buttons.job
 }).load(trak.url,
 {
 
 	act:		'formAddJob',
 	pid:		$(this).attr('data-patientid'),
 	vid:		$(this).attr('data-visitid'),
 	eid:		$(this).attr('data-jobid')
  	
 },function()
 {
 
		 	$('.dialogButtons').buttonset().css('font-size','12px');
 			$('.dialogButtons#jobButtons .ui-button-text').removeClass('ui-button-text').addClass('refButtonsPad');
			$('.db input[name=db]').click(function(){

				if ($(this).val() == 1)
				{
					$('#addJob').show();
					$('#addJobResult').hide();
				};
				if ($(this).val() == 2)
				{
					$('#addJobResult').show();
					$('#addJob').hide();									
				};
	 		});
			$("#addJob").validationEngine('init');
			$("#addJob").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
			trak.fn.decode('#addJob textarea[name=event_desc]');
			trak.fn.decode('#addJobResult textarea[name=event_result]');
			$("#addJob input[name=event_date]").datepicker({
		changeMonth:	true,
		changeYear:		false,
		dateFormat:		'dd/mm/yy',
		minDate:		'-0y'
	});
			$("#addJob input[name=event_time]").timepicker({
		setDate:		new Date()	
	});
			$('#statusButtons').click(function(){
		 _tVal = 0;
		 $("#addJob input[name=status]:checked").each(function(){
		  _tVal += Number($(this).val());
		 });
		 $('#addJob input[name=statusSum]').val(_tVal);
	});
			$(".refButtonsPad").hover(function(){
			
				$('#_jobDesc').html( ' <span style="color:#AAA;">' + $(this).find('img').attr('data-desc') + '</span>' );
			
			},function(){
			
				$('#_jobDesc').html('');
			
			});
 
 });
 return false;

	});
			$('.patient-move').live('click',function() {
				 trak.dialogInit();
				 dialog.dialog({
				  close: function(){
				  
					$('#movePat').validationEngine('hideAll');
					trak.dialogFinish();
					
				  },
				  width:400,
				  height:370,
				  modal: true,
				  buttons: trak.buttons.move
				 }).load(trak.url,{
				 
					act:		'formMovePat',
					vid:		$(this).attr('data-visitid')
					 
				 },function(){
					
					dialog.dialog("option","title",'Move ' + $('#movePat').attr('rel'));
					//dialog.dialog("option","title",'Move ' +  $('#_AESname_'+$('#movePat').attr('data-visitid')).html());
					$("#movePat").validationEngine('init');
					$("#movePat").validationEngine('attach', {scroll: false,validationEventTrigger: ''});
					$('.dialogButtons').buttonset();
					if ($('#movePat input[name=nBed]:checked').val() == 0) {
						$("#movePat #nBedNum").attr("disabled", true).css({opacity:0.6}).val('');
					};
					if ($('#movePat input[name=nBed]:checked').val() == 127) {
						$("#movePat #nBedNum").attr("disabled", true).css({opacity:0.6}).val('');
					};
				 });
				 return false;
				});				
			$('.patient-edit').live('click',function() {
 				trak.dialogInit();
				dialog.dialog({
				  close: function(){
						$('#editPat').validationEngine('hideAll');
						trak.dialogFinish();
				  },
				  width:400,
				  height:540,
				  modal: true,
				  buttons: trak.buttons.edit
				 }).load(trak.url,{
				 
					act:		'formEditPat',
					vid:		$(this).attr('data-visitid')
					 
				}, function(){
					dialog.dialog("option","title",'Alter referral for ' + $('#editPat').attr('rel'));
					$("#editPat").validationEngine('init');
					$("#editPat").validationEngine('attach', {scroll: false,validationEventTrigger: ''});
					$(".dialogButtons").buttonset();
					if (  $('#editPat input[name=nBed]:checked').val() == 0 ) {
						$("#editPat #nBedNum").attr("disabled", true).css({opacity:0.6});
					};
				 });
 				return false;
			});
			$('.patient-note').live('click',function() {
 trak.dialogInit();
 dialog.dialog({
  close: function(){
  	$('#formAddNote').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  width:640,
  height:410,
  modal: true,
  open: function(){
  	$('.ui-button').blur();
  },
  create:	function() {
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/Notebook.png"></div>');

  },
  buttons: trak.buttons.notes
 }).load(trak.url,
 {

	act:	'formAddNote',
	vid:	$(this).attr('data-visitid'),
 	id:		$(this).attr('data-noteid') 
 	
 },function()
 {
  dialog.dialog("option","title",'Entry for ' + $('#formAddNote').attr('rel'));
  trak.fn.decode('#formAddNote textarea[name=formID_note]');
  $("#formAddNote").validationEngine('init');
  $("#formAddNote").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
  $('#refButtons').buttonset();
  $('#refButtons .ui-button-text').removeClass('ui-button-text').addClass('refButtonsPad').hover(function(){
   refEle = $(this);
   $('#refWho').html('<span style="color:#AAA;">'+refEle.children("img").attr("rel")+'</span>');
  },function(){
   $('#refWho').html('');
  }).click(function(){
   refEle = $(this);
   $('#refDetails').html(  'from ' + refEle.children("img").attr("rel")    );
   $('#formID_note').focus();
  });
 });
 return false;
});

			$('.patient-labcentre').live('click',function(){

			// Get cookies
			$.ajax(

trak.helperUrl.labcentreLogin,
{
	async:		true,
	xhrFields: {

    	withCredentials:	true

    },
	success:	function(data, textStatus, XMLHTTPRequest) {

		trak.helperParams.labcentreLogin.sessionID	=	trak.fn.readCookieN('sessionId',	XMLHTTPRequest.getResponseHeader('Set-Cookie'));
		trak.helperParams.labcentreLogin.logininfo	=	trak.fn.readCookieN('logininfo',	XMLHTTPRequest.getResponseHeader('Set-Cookie'));
		trak.helperParams.labcentreLogin.timeout	=	trak.fn.readCookieN('timeout',		XMLHTTPRequest.getResponseHeader('Set-Cookie'));

	}
});

		 trak.dialogInit();
		 dialog.dialog({
		  title: 'Labcentre',
		  close: function(){
			trak.dialogFinish();
		  },
		  width:800,
		  height:600,
		  modal: true
		 }).html('<iframe id="_labcentre" width="100%" height="100%" frameborder="0"></iframe>');

//		 $("#_labcentre").one('load',function() {
//			$("#_labcentre").attr('src',trak.helperUrl.labcentreSearch+'?'+$.param(trak.helperParams.labcentreSearch));
//		 }).attr('src',trak.helperUrl.labcentreLogin+'?'+$.param(trak.helperParams.labcentreLogin));

		 $("#_labcentre").one('load',function() {
			$("#_labcentre").one('load',function() {	
				$("#_labcentre").attr('src',trak.helperUrl.labcentreSearch+'?'+$.param(trak.helperParams.labcentreSearch));
			}).attr('src',trak.helperUrl.labcentreLogin+'?'+$.param(trak.helperParams.labcentreLogin));
		 }).attr('src',trak.helperUrl.labcentreLogin);

// If ajax could load the frame...
// $.ajax{
// trak.helperUrl.labcentreLogin,
// {
// 	data:			trak.helperParams.labcentreLogin,
// 	headers:		{
// 
// 		Cookie:	'sessionId='+trak.helperParams.labcentreLogin.sessionID+';logininfo='+trak.helperParams.labcentreLogin.logininfo+';timeout='+trak.helperParams.labcentreLogin.timeout+';'
// 
// 	}
// 	success:		function(){}
// }
// };

		 return false;
		});
			$('.patient-prism').live('click',function(){
		 trak.dialogInit();
		 dialog.dialog({
		  title: 'Prism Cardiorespiratory System',
		  close: function(){
			trak.dialogFinish();
		  },
		  width:800,
		  height:600,
		  modal: true
		 }).html('<iframe id="_prism" width="100%" height="100%" frameborder="0"></iframe>');
		 $("#_prism").one('load',function() {
			$("#_prism").attr('src',trak.helperUrl.prismSearch+'?'+$.param(trak.helperParams.prismSearch));
		 }).attr('src',trak.helperUrl.prismLogin+'?'+$.param(trak.helperParams.prismLogin));
		 return false;
		});

			$(".patient-toggle").live('click', function () {
	var toScrollTo = 0;
    var toggled = $(this).data('toggled');
    $(this).data('toggled', !toggled);
    
    if (!toggled)
    {
	    $(this).find("img:first").attr({src:"gfx/document_decrypt.png"});
		sid = $(this).find('img').attr('rel');
		$('.patient-toggle').each(function() {
			hid = $(this).find('img').attr('rel');
		 	if (sid == hid) {
				$('#patBoxID_'+hid).fadeTo('fast',1);
				if ($('#patBoxID_'+hid).hasClass('_dull')) {
			 		$('#patBoxID_'+hid).removeClass('_dull').addClass('x_dull');
		   		}
		 	} else { 
				$('#patBoxID_'+hid).fadeTo('slow',0.75);
			}
		});
	    for (i in trak.visRef[sid]) {
			$('#refHREF_' + trak.visRef[sid][i]).addClass('patient-referral');
			// $('#refHREF_' + trak.visRef[sid][i]).attr('href',$('#refHREF_' + trak.visRef[sid][i]).attr('data-form'));
	    };
	    for (i in trak.jobsRefIDList[sid]) {
			$('#jobID_' + trak.jobsRefIDList[sid][i]).addClass('patient-jobs');
	    };

		$("#patBoxButID_"+sid).html('<td colspan="1"><center>⤷</center></td><td colspan="4"><img src="gfx/fbThrobber.gif" /></td>');
		$("#patBoxButID_"+sid).load(
    		trak.url,
    		{
    			act:	'ajax',
    			type:	'patBoxSub',
    			id:		sid,
    			status:	$(this).find("img").attr("data-status")
    		},
    		function() 
    		{
 
 // consider changing to $('.id',$('#patBoxButID_'+sid)) to limit to added element
 
    	
				$(".pBSButtonDisc").button({icons:{primary:"ui-icon-trash"},text:true});
				$(".pBSButtonHAN").button({icons:{primary:"ui-icon-lightbulb"},text:true});

//				$('.document-clerking').button({icons:{primary:"ui-icon-document"},text:true});
				$(".patient-move, .patient-edit").button({icons:{primary:"ui-icon-transferthick-e-w"},text:true});
//				$('.document-letter').button({icons:{primary:"ui-icon-document"},text:true});
				$(".patient-refer").button({icons:{primary:"ui-icon-link"},text:true});
				$(".patient-note").button({icons:{primary:"ui-icon-script"},text:true});
				$('.patient-labcentre').button({icons:{primary:"ui-icon-gear"},text:true});
				$('.patient-prism').button({icons:{primary:"ui-icon-gear"},text:true});
				$('.patient-notes').button({icons:{primary:"ui-icon-script"},text:true});
				$("#patBoxButID_"+sid+' .patient-jobs').button({icons:{primary:"ui-icon-wrench"},text:true});
 				if ($('.patient-notes').attr('data-number') > 0) {
					$('.patient-notes').badger($('.patient-notes').attr('data-number'));
				};  


			$(".patient-documents").button({icons:{primary:"ui-icon-clipboard"},text:true});
//			$(".patient-consultants-mau").button({icons:{primary:"ui-icon-clipboard"},text:true});
//			$(".patient-consultants-oc").button({icons:{primary:"ui-icon-clipboard"},text:true});
				
    		}).toggle();
		toScrollTo = sid; // $.scrollTo("#patBoxID_"+sid,'100%');
    }
    else
    {
		// Close code. This is replicated in .pBLB/each below
		$(this).find("img:first").attr({src:"gfx/document_encrypt.png"});
		sid = $(this).find('img').attr('rel');
		$('.patient-toggle').each(function() {
			hid = $(this).find('img').attr('rel');
			if ($('#patBoxID_'+hid).hasClass("_dull"))
			{
			 $('#patBoxID_'+hid).fadeTo('fast',0.75);
			} else if ($('#patBoxID_'+hid).hasClass("x_dull"))
			{
			 $('#patBoxID_'+hid).fadeTo('fast',0.75);
			 $('#patBoxID_'+hid).removeClass('x_dull').addClass('_dull');
			} else
			{
			 $('#patBoxID_'+hid).fadeTo('fast',1);
			};
		});
		for (i in trak.visRef[sid])
		{
			$('#refHREF_' + trak.visRef[sid][i]).removeClass('patient-referral');
			// $('#refHREF_' + trak.visRef[sid][i]).removeAttr('href');
			// $('#refHREF_' + trak.visRef[lid][i]).removeAttr('class');
		};
		for (i in trak.jobsRefIDList[sid]) {
			$('#jobID_' + trak.jobsRefIDList[sid][i]).removeClass('patient-jobs');
	    };
		$("#patBoxButID_"+sid).toggle().html(''); // 02-04-2012 Added .html('') stops dup classes;
    };    
    cid = $(this).find('img').attr('rel');    
    $('.patient-toggle').each(function() {
		lid = $(this).find('img').attr('rel');
		tog = $(this).data('toggled');
		if (cid != lid && tog) {
			$(this).find("img:first").attr({src:"gfx/document_encrypt.png"});
				for (i in trak.visRef[lid])
				{
					//$('#refHREF_' + trak.visRef[lid][i]).removeAttr('class');
					//$('#refHREF_' + trak.visRef[lid][i]).removeAttr('href');
					$('#refHREF_' + trak.visRef[lid][i]).removeClass('patient-referral')
				};
				for (i in trak.jobsRefIDList[lid]) {
					$('#jobID_' + trak.jobsRefIDList[lid][i]).removeClass('patient-jobs');
	    		};
			$("#patBoxButID_"+lid).hide().html(''); // 02-04-2012 Added .html('') stops dup classes
			$(this).data('toggled', false);
		}
		});
	// Defer the scroll to here, so any boxes than needed closing have been closed already
	if (toScrollTo != '0') { $.scrollTo("#patBoxID_"+toScrollTo,'100%'); };
		
});
			$('.patient-notes').live('click',function(){

 NIvisitID = $(this).attr('data-visitid');
 _name = trak.fn.name($(this).attr('data-visitid'));		
 trak.dialogInit();
 dialog.dialog({
  close: function() {
  		trak.dialogFinish();
  },
  open: function(){
  	$('.ui-button').blur();
  },
  create:	function() {
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/Notebook.png"></div><div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Notes</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Referrals and jobs</label></div><div style="float:left;margin:.5em 0 .5em .8em" id="_print">Print</div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
		$('#_print').button({icons:{primary:"ui-icon-print"},text:true}).click(function(){
		$('.notePaper').printElement({
			
				printMode:	'iframe',
				pageTitle:	_name,
				leaveOpen:	false
				
			});
			
		});			  
						  
  },
  width:800,
  height:600,
  title:'Notes for ' + _name,
  modal: true,
  buttons: trak.buttons.viewnotes
 }).load(trak.url,
 {			vid:	NIvisitID,	
 			act:	"ajax",
			type:	"notes",
			filter:	1
 },function(){

	$('#dialog').blur();
	$('.db input[name=db]').click(function(){
		var notesThrobberTimeout = setTimeout(function(){
			$('#notes-throbber').show();
		},250);
		$('#dialog').load( trak.url,{
										vid:	NIvisitID,
										act:	"ajax",
										type:	"notes",
										filter:	$(this).val()
 		},function(){
 		
 			clearTimeout(notesThrobberTimeout);
 			$('#notes-throbber').hide();
 			for (var x in decodeIDList) {
				var id = decodeIDList[x];
				trak.fn.decode("#noteID_" + id);  
			};
 			
 		});
	return false;
	
	});
	for (var x in decodeIDList) {
		var id = decodeIDList[x];
		trak.fn.decode("#noteID_" + id);  
	};


 });
 return false;
 
 });
  			$('.patient-refer').live('click',function() {
 trak.dialogInit();
 switch($(this).attr('data-type')) {
	case "127":
		// HAN
		dialog.dialog({
			title: 'Job for Hospital at Night',
			close: function(){
				//dialogClose(dialog);
				$('#formAddRef').validationEngine('hideAll');
				clearInterval(clockMinutes);
				clearInterval(clockSeconds);
				clearInterval(clockHours);
				$("#dialog").dialog("destroy").remove();
			},
			width: 350,
			height:470,
			modal: true,
			buttons: objRefEditButtonsHAN
		}).load(url,function(){
  		 $('.dialogButtons').buttonset();
		 $('#formAddRef #formID_hx').focus();
		 $("#formAddRef").validationEngine('init');
		 $("#formAddRef").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
		});
	break;
	default:
		dialog.dialog({
			close: function(){
				$('#formAddRef').validationEngine('hideAll');
				trak.dialogFinish();
			},
			width: 640,
			height:410,
			modal: true,
			create:	function() {
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/mag.png"></div>');

  },
			open: function(){
  	$('.ui-button').blur();
  },
			buttons: trak.buttons.refer.create
		}).load(trak.url,{
		
			act:	'formAddRef',
			vid:	$(this).attr('data-visitid')
		
		
		},function(){
		 dialog.dialog("option","title",'Referral for ' + $('#formAddRef').attr('rel'));

		 $('.dialogButtons').buttonset();
		 $('#refButtons .ui-button-text').removeClass('ui-button-text').addClass('refButtonsPad').hover(function(){
		  refEle = $(this);
		  $('#refWho').html(' '+refEle.children("img").attr("rel"));
		 },function(){
		  $('#refWho').html('…');
		 }).click(function(){
		  refEle = $(this);
		  $('#refDetails').html('to '+refEle.children("img").attr("rel"));
		  $('#formID_note').focus();
		 });
		 $("#formAddRef").validationEngine('init');
		 $("#formAddRef").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
		});
	break;
 };
 return false;
}); 
			$('.patient-referral').live('click',function() {

 trak.dialogInit();

 switch( $(this).attr('data-type') ) {

	case "1":
		// Doctor
		dialog.dialog({
  create: function(){
   $(".ui-dialog-titlebar").hide();
   $(".ui-dialog-content").css('padding','0');   
  },
  open: function(){
  	$('.ui-button').blur();
  },
  beforeClose: function(){
 	if (_rxChanged == 1) {
 		trak.confirm("The notes have been altered. Press <strong>Save</strong> to remember the changes or <strong>Cancel</strong> to discard them.",190);
 		return false;
 	};
  },
  close: function(){
  	$('#formEditMedic').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  draggable:false,
  width:670,
  height:300,
  modal: true,
  buttons: trak.buttons.refer.medic
 }).load(trak.url,{
 
 	act:	'formEditMedic',
 	id:		$(this).attr('data-refid'),
 	vid:	$(this).attr('data-visitid'),
 	type:	$(this).attr('data-type')
 
 },function(){

  $("#formEditMedic").validationEngine('init');
  $("#formEditMedic").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
  $('#dialog').css('overflow','hidden'); // gets rid of the scrollbars in #dialog
  $('#tabs').tabs();
  // Forces tabs into title bar. See also dialog.create
  $('#tabs').find('.ui-tab-dialog-close').append($('a.ui-dialog-titlebar-close'));
  $('#tabs').find('.ui-tab-dialog-close').css({'position':'absolute','right':'6px', 'top':'20px'});
  $('#tabs').find('.ui-tab-dialog-close > a').css({'float':'none','padding':'0'});
  $('#tabs.ui-widget-content').css({'border':'0px'});
  $('.ui-tabs-nav').append('<div class="ui-dialog-title" style="padding-top:4px;padding-left:13px">Medical notes for '+$('#formEditMedic').attr('rel')+'</div>');
  $('.dialogButtons').buttonset().css('font-size','13px');

  

 $('input[name=ews],input[name=triage],input[name=resus]').click(function(){
 	 _rxChanged = 1;
 });
 $('.SBARfield, .SBARfieldTall, .noteAuthorField').change(function(){
	 _rxChanged = 1;
 });
 
 	trak.fn.forms.common();
	trak.fn.forms.pmhx();
	trak.fn.forms.activehx();

 // Code for ActiveHx


 });
 		break;
	case "2":
		// Staff Nurse: copied from $('.formEditNursing').live with adaptation to 'url'
		dialog.dialog({
  create: function(){
   $(".ui-dialog-titlebar").hide();
   $(".ui-dialog-content").css('padding','0');   
  },
  open: function(){
  	$('.ui-button').blur();
  },
  beforeClose: function(){
 	if (_rxChanged == 1) {
 		trak.confirm("The notes have been altered. Press <strong>Save</strong> to remember the changes or <strong>Cancel</strong> to discard them.",190);
 		return false;
 	};
  },
  close: function(){
  	$('#formEditNursing').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  draggable:false,
  width:670,
  height:300,
  modal: true,
  buttons: trak.buttons.refer.nurse
 }).load(trak.url,{
 
 	act:	'formEditNursing',
 	id:		$(this).attr('data-refid'),
 	vid:	$(this).attr('data-visitid'),
 	type:	$(this).attr('data-type')
 
 },function(){
  // dialog.dialog("option","title",'Nursing notes for ' + $('#formEditNursing').attr('rel'));
  $("#formEditNursing").validationEngine('init');
  $("#formEditNursing").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
  $('#dialog').css('overflow','hidden'); // gets rid of the scrollbars in #dialog
  $('#tabs').tabs();
  // Forces tabs into title bar. See also dialog.create
  $('#tabs').find('.ui-tab-dialog-close').append($('a.ui-dialog-titlebar-close'));
  $('#tabs').find('.ui-tab-dialog-close').css({'position':'absolute','right':'6px', 'top':'20px'});
  $('#tabs').find('.ui-tab-dialog-close > a').css({'float':'none','padding':'0'});
  $('#tabs.ui-widget-content').css({'border':'0px'});
  $('.ui-tabs-nav').append('<div class="ui-dialog-title" style="padding-top:4px;padding-left:13px">Nursing notes for '+$('#formEditNursing').attr('rel')+'</div>');
  $('.dialogButtons').buttonset().css('font-size','13px');
  // Following moved from index.php
  

 
 $('input[name=ews],input[name=triage],input[name=resus]').click(function(){
 	 _rxChanged = 1;
 });
 $('.SBARfield, .SBARfieldTall, .noteAuthorField').change(function(){
	 _rxChanged = 1;
 });
 
 trak.fn.forms.common();
 trak.fn.forms.pmhx();
	
  // End move from index.php
});
 		break;













	case "5":
 		// Pharmacist: copied from $('.rxEdit').live with adaptation to 'url'
 		dialog.dialog({
  close: function(){
  	$('#formEditRx').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  open: function(){
  	$('.ui-button').blur();
  },
  beforeClose: function(){
  	if (_rxChanged == 1) {
  		trak.confirm("The prescription has been altered. Press <strong>Save</strong> to remember the changes or <strong>Cancel</strong> to discard them.",190);
  		return false;
  	};
  },
  width:760,
  height:440,
  modal: true,
  buttons: trak.buttons.refer.pharma
 }).load(trak.url,{
 
 	act:	'formEditRx',
 	id:		$(this).attr('data-refid'),
 	vid:	$(this).attr('data-visitid'),
 	type:	$(this).attr('data-type')
 
 },function(){
  dialog.dialog("option","title",'Prescription reconcilliation for ' + $('#formEditRx').attr('rel'));
  $("#formEditRx").validationEngine('init');
  $("#formEditRx").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
  $('#dialog').css('overflow','hidden'); // gets rid of the scrollbars in #dialog
 });
		break;
 	default:
 		dialog.dialog({
  title: 'Edit a referral',
  close: function(){
  	trak.dialogFinish();
  },
  width: 650,
  height:510,
  modal: true,
  create:	function(){
  		$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Outcome</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Referral</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
	},
  buttons: trak.buttons.refer.edit
 }).load(trak.url,{
 
 	act:	'formUpdateRef',
 	id:		$(this).attr('data-refid'),
 	vid:	$(this).attr('data-visitid'),
 	type:	$(this).attr('data-type')
 
 },function(){
 
 			$('.db input[name=db]').click(function(){

				if ($(this).val() == 1)
				{
					$('#refOutcome').show();
					$('#refInfo').hide();
					$('#_AES_refHx').html( $('textarea[name=formID_refnote]').val() );
				};
				if ($(this).val() == 2)
				{
					$('#refOutcome').hide();
					$('#refInfo').show();									
				};
	 		});
			$('textarea[name=formID_refnote]').val( $('#_AES_refHx').html() );
 
 });
 };
 return false;

}); 
 
 			$('.document-clerking').live('click',function(){
 trak.dialogInit();
 _name = trak.fn.name($(this).attr('data-visitid'));
 dialog.dialog({
  title: 'Working...',
  close: function(){
  	trak.dialogFinish();
  },
  width:800,
  height:600,
  modal: true
 }).load(trak.url,{
 
 	vid:	$(this).attr('data-visitid'),
 	act:	'document',
 	type:	1
 
 },function(){
 	dialog.dialog("option","title",'Clerking document for ' + _name); 
 });
 return false;
});
  			$('.document-letter').live('click',function(){
 trak.dialogInit();
 _name = trak.fn.name($(this).attr('data-visitid'));
 dialog.dialog({
  title: 'Working...',
  close: function(){
  	trak.dialogFinish();
  },
  width:800,
  height:600,
  modal: true
 }).load(trak.url,{
 
 	vid:	$(this).attr('data-visitid'),
 	act:	'document',
 	type:	2
 
 },function(){
 	dialog.dialog("option","title",'Discharge letter for ' + _name); 
 });
 return false;
});
 
 			$(".patient-documents").live('click',function(event){
				$(this).qtip({
	overwrite:	true,
	hide:	 {
      event: 'unfocus'
    },
	show: 		{
         event: event.type,
         ready: true
      },
	content:	{
      text: '<div id="'+trak.dialog+'"><img src="gfx/fbThrobber.gif" /></div>',
      ajax: {
      	url: trak.url,
         type: 'POST',
         data: 	{
    					act:	"ajax",
    					type:	"documents",
						vid:	$(this).attr('data-visitid')    		
         		} 
      }
  				 },
	position:	{
				viewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				}
      			}
},event);
			});

 			$(".patient-consultants-mau").live('click',function(event){
				$(this).qtip({
	overwrite:	true,
	hide:	 {
      event: 'unfocus'
    },
	show: 		{
         event: event.type,
         ready: true
      },
	content:	{
      text: '<div id="'+trak.dialog+'"><img src="gfx/fbThrobber.gif" /></div>',
      ajax: {
      	url: trak.url,
         type: 'POST',
         data: 	{
    					act:	"ajax",
    					type:	"consultantsmau",
						sid:	sID    		
         		} 
      }
  				 },
	position:	{
				viewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				}
      			}
},event);
			});
 			$(".patient-consultants-oc").live('click',function(event){
 				// Overflow set to avoid flash of scrollbar when opening qTip
 				//$("body").css("overflow", "hidden");
				$(this).qtip({
	overwrite:	true,
	hide:	 	{
    	event:	'unfocus'
    },
	show: 		{
		event:	event.type,
		ready:	true
      },
	content:	{
      text: '<div id="'+trak.dialog+'"><img src="gfx/fbThrobber.gif" /></div>',
      ajax: {
      	url: trak.url,
        type:		'POST',
    	data: 		{
    					act:	"ajax",
    					type:	"consultantsoc",
						sid:	sID    		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#consultants-oc .hdrWideButtons7").css({"font-size":"13px","width":"140px","text-align":"left"}).button({icons:{primary:"ui-icon-person"}});
       	
         }
    	}
  				 },
	position:	{
				viewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#consultants-oc .hdrWideButtons7").css('width') +8  }
      			},
    events:		{
    	show:	function(){
    				if (!($("body").height() > $(window).height()))
    				{
    					// Prevent a flash of scrollbar
    					$("body").css("overflow", "hidden");
    				};
    			},
    	hide:	function(){
    				$("body").css("overflow", "auto");
    			}   
    }
},event);
				//$("body").css("overflow", "auto");
			});
 
 
 			$("#lists-other").live('click',function(event){
				$(this).qtip({
	overwrite:	true,
	hide: {
      event: 'unfocus'
    },
	show: 		{
         event: event.type,
         ready: true
      },
	content:	{
      text: '<div id="'+trak.dialog+'"><img src="gfx/fbThrobber.gif" /></div>',
      ajax: {
         url: trak.url,
         type: 'POST',
         data: 	{
    					act:	"ajax",
    					type:	"lists-main",
						site:	sID,
						ward:	wID,
						filter: fID     		
         		}, 
         success:	function(data, status) {
         	this.set('content.text', data);
  			$("#lists-profs div").css({"font-size":"14px","width":"200px","text-align":"left"}).button({icons:{primary:"ui-icon-person"}});
			$('.hdrWideButtons3',$('#lists-profs')).each(function(){
				if ($(this).attr('data-number') != '0') {
					$(this).badger($(this).attr('data-number'));
				};
			});
			$("#lists-other").qtip('reposition');
         }



      }
  				 },
	position:	{
				viewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#lists-other .hdrWideButtons3").css('width') +8  }
      			}
},event);
			});
			$("#lists-byconsultant").live('click',function(event){
				$(this).qtip({
	overwrite:	true,
	hide: {
      event: 'unfocus'
    },
	show: 		{
         event: event.type,
         ready: true
      },
	content:	{
      text: '<div id="'+trak.dialog+'"><img src="gfx/fbThrobber.gif" /></div>',
      ajax: {
         url: trak.url,
         type: 'POST',
         data: 	{
    					act:	"ajax",
    					type:	"lists-cons",
						site:	sID,
						ward:	wID,
						filter: fID     		
         		}, 
         success:	function(data, status) {
         	this.set('content.text', data);
  			$("#lists-consultant div").css({"font-size":"14px","width":"140px","text-align":"left"}).button({icons:{primary:"ui-icon-person"}});
			$("#lists-byconsultant").qtip('reposition');
         }



      }
  				 },
	position:	{
				viewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#lists-other .hdrWideButtons3").css('width') +8  }
      			}
},event);
			});
 
 
 

	},	
	visRef:			Array(),
	jobsRefIDList:	Array(),
	clickRef:		Array(),
	refreshTime:	60,
	url:			"http://pattrak.dyndns.org/MyWeb/trak/index.php",
	curl:			"http://pattrak.dyndns.org/MyWeb/trak/lib/clerking.php",
	xhelperUrl:		{
	
					labcentreLogin:		'http://www.glasgowwarriors.com/cgi-bin/mt.cgi',
					labcentreSearch:	'http://www.glasgowwarriors.com/cgi-bin/mt.cgi'
					
					},
	xhelperParams:	{
	
					labcentreLogin:		{username:'admin',password:function(){return $('.action-labcentre').attr('data-pas')}},
					labcentreSearch:	{__mode:'list_entries',blog_id:'2'}
					
					},
	helperUrl:		{
	
					labcentreLogin:		'http://159.170.208.54:42000/labcentreweb/login.asp',
					labcentreSearch:	'http://159.170.208.54:42000/labcentreweb/enquiry.asp',
					prismLogin:			'http://nm-yokuts/prism-net/security.asp',
					prismSearch:		'http://nm-yokuts/prism-net/patientsearch.asp'
					
					},
	helperParams:	{
	
					labcentreLogin:		{
											username:				'DA02NS',
  											password:				'HARRY33'
  										},
					labcentreSearch:	{
  											SearchMethod:			'PatientNumber',
  											CurrentPage:			'OrderPatient',
  											NextPage:				'OrderGeneral',
  											PageAction:				'NextPage',
  											enquiryPatientNumber:	function() {
  																		return $('.patient-labcentre').attr('data-pas');
  																	}
 								  		},
 					prismLogin:			{
 											username:				'dt03dr',
 											password:				'Lenzieg68',
 											Func_Connection:		'PG Prism ALL;Prism;prism'
 					
 										},
 					prismSearch:		{
 											hosp:					function() {
  																		return $('.patient-prism').attr('data-pas');
  																	}
 										}
					
					},									
	dialog:			"dialog"

};



$(function() {



$("#trakDash").button({icons:{primary:"ui-icon-gear"},text:true}).live('click',function(){

   		 $('#trakDashRow').load(
    		'http://'+HOST+'/index.php',
    		{
    			act:		'trakDash',
    			dashSite:	sID
    	}).toggle();
    	return false;






});





// jquery: Discharge (Discharge patient)
// 25th Sep 2011: updated for loading status
function dialogClose(dID) {
	dID.dialog("destroy");
	dID.remove();
}
objDiscButtons = {
  
   "☠": function(){

		$.ajax({
			type:    "POST",
			url:     "http://" + HOST + "/index.php",
			data:    ({
						act:	 	"dbDiscPat",
						disctype:	2,
						id:			$("#discPat input[name=id]").val(),
						edd:		$("#discPat input[name=eddd]").val()
					 }),
			success: function(data){
						trak.refresh(sID,wID,fID,lID);
						//location.reload();
						$("#dialog").dialog("destroy").remove();
						//dialogClose(dialog)
					 },
			error:	 function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					 }
		}); // $.ajax

	}, 

	Discharge: function() {
		if ($("#discPat").validationEngine('validate')) {
		$.ajax({
		
			type:    "POST",
			url:     "http://" + HOST + "/index.php",
			data:    ({
						act:	 	"dbDiscPat",
						disctype:	0,
						id:			$("#discPat input[name=id]").val(),
						edd:		$("#discPat input[name=eddd]").val()
					 }),
			success: function(data){
						//location.reload();
						trak.refresh(sID,wID,fID,lID);
						$("#dialog").dialog("destroy").remove();
					 	//dialogClose(dialog)
					 },
			error:	 function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					 }

		}); // $.ajax
		} else
									{
										window.setTimeout(function(){$('#discPat').validationEngine('hideAll')}, 6000);
									}; // validationEngine
	},
				
	Predict: function() {
		if ($("#discPat").validationEngine('validate')) {
		$.ajax({
		
			type:    "POST",
			url:     "http://" + HOST + "/index.php",
			data:    ({
						act:	 	"dbDiscPat",
						disctype:	1,
						id:			$("#discPat input[name=id]").val(),
						edd:		$("#discPat input[name=eddd]").val()
					 }),
			success: function(data){
			//alert(data);
						//location.reload();
						//trakRefresh(sID,wID,fID);
						trak.refreshRow($("#discPat input[name=id]").val());
						$("#dialog").dialog("destroy").remove();
						//dialogClose(dialog)
					 },
			error:	 function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					 }
					 
		}); // $.ajax
		} else
									{
										window.setTimeout(function(){$('#discPat').validationEngine('hideAll')}, 6000);
									}; // validationEngine
	}
  };
$('.discPat').live('click',function() {
 var url = this.href; var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialog.dialog({
  close: function(){$('#discPat').validationEngine('hideAll');dialogClose(dialog);},
  width:410,
  height:205,
  modal: true,
  buttons: objDiscButtons
 }).load(url,function(){
    dialog.dialog("option","title",'Discharge ' + $('#discPat').attr('rel'));
    $("#discPat").validationEngine('init');
	$("#discPat").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
 	$(".dialogButtons").buttonset();
	$("#eddd").datepicker({dateFormat: 'dd/mm/yy',altFormat: 'yy-mm-dd',minDate:0});
	$(".eddButton").click(function(){
		$("#eddd").val($(this).attr("rel"));
	});
	// $("#eddd").click(function(){
	//	$(".eddButton").attr("checked","").button("refresh");
	// });
 });
 return false;
});
// End: Discharge










}); // $(function()