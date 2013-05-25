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
var between = function(a,b) {
	if (a>b) {
		return this>=b && this<=a
	}
	else 
	{
		return this>=a && this<=b
	}
};
Number.prototype.between = between;
(function ($) {
    $.StickyTableHeaders = function (el, options) {
        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;

        // Access to jQuery and DOM versions of element
        base.$el = $(el);
        base.el = el;

        // Cache DOM refs for performance reasons
        base.$window = $(window);
        base.$clonedHeader = null;
        base.$originalHeader = null;

        // Add a reverse reference to the DOM object
        base.$el.data('StickyTableHeaders', base);

        base.init = function () {
            base.options = $.extend({}, $.StickyTableHeaders.defaultOptions, options);

            base.$el.each(function () {
                var $this = $(this);

                // remove padding on <table> to fix issue #7
                $this.css('padding', 0);

                $this.wrap('<div class="divTableWithFloatingHeader"></div>');

                base.$originalHeader = $('thead:first', this);
                base.$clonedHeader = base.$originalHeader.clone();

                base.$clonedHeader.addClass('tableFloatingHeader');
                base.$clonedHeader.css({
                    'position': 'fixed',
                    'top': 0,
                    'left': $this.css('margin-left'),
                    'display': 'none'
                });

                base.$originalHeader.addClass('tableFloatingHeaderOriginal');
                
                base.$originalHeader.before(base.$clonedHeader);

                // enabling support for jquery.tablesorter plugin
                // forward clicks on clone to original
                $('th', base.$clonedHeader).click(function(e){
                    var index = $('th', base.$clonedHeader).index(this);
                    $('th', base.$originalHeader).eq(index).click();
                });
                $this.bind('sortEnd', base.updateCloneFromOriginal );
            });

            base.updateTableHeaders();
            base.$window.scroll(base.updateTableHeaders);
            base.$window.resize(base.updateTableHeaders);
        };

        base.updateTableHeaders = function () {
            base.$el.each(function () {
                var $this = $(this);

                var fixedHeaderHeight = isNaN(base.options.fixedOffset) ? base.options.fixedOffset.height() : base.options.fixedOffset;

                var offset = $this.offset();
                var scrollTop = base.$window.scrollTop() + fixedHeaderHeight;
                var scrollLeft = base.$window.scrollLeft();

                if ((scrollTop > offset.top) && (scrollTop < offset.top + $this.height())) {
                    base.$clonedHeader.css({
                        'top': fixedHeaderHeight,
                        'margin-top': 0,
                        'left': offset.left - scrollLeft,
                        'display': 'block'
                    });

                    base.updateCloneFromOriginal();
                }
                else {
                    base.$clonedHeader.css('display', 'none');
                }
            });
        };

        base.updateCloneFromOriginal = function () {
            // Copy cell widths and classes from original header
            $('th', base.$clonedHeader).each(function (index) {
                var $this = $(this);
                var origCell = $('th', base.$originalHeader).eq(index);
                $this.removeClass().addClass(origCell.attr('class'));
                $this.css('width', origCell.width());
            });

            // Copy row width from whole table
            base.$clonedHeader.css('width', base.$originalHeader.width());
        };

        // Run initializer
        base.init();
    };

    $.StickyTableHeaders.defaultOptions = {
        fixedOffset: 0
    };

    $.fn.stickyTableHeaders = function (options) {
        return this.each(function () {
            (new $.StickyTableHeaders(this, options));
        });
    };

})(jQuery);
function isValidNhsNumber(txtNhsNumber) {

    var isValid = false;

    if (txtNhsNumber.length == 10) {

        var total = 0;

        var i = 0;
        for (i = 0; i <= 8; i++) {
            var digit = txtNhsNumber.substr(i, 1);
            var factor = 10 - i;
            total += (digit * factor);
        }

        var checkDigit = (11 - (total % 11));
        
        if (checkDigit == 11) { checkDigit = 0; }

        if (checkDigit == txtNhsNumber.substr(9, 1)) { isValid = true; }
    }

    return isValid;
};
jQuery.fn.ForceNumericOnly = function() {
    return this.each(function()
    {
        $(this).keydown(function(e)
        {
            var key = e.charCode || e.keyCode || 0;
            // allow backspace, tab, delete, arrows, numbers and keypad numbers ONLY
            return (
                key == 8 || 
                key == 9 ||
                key == 46 ||
                (key >= 37 && key <= 40) ||
                (key >= 48 && key <= 57) ||
                (key >= 96 && key <= 105));
        });
    });
};

// Aes.Ctr.encrypt(    ,__PW,256)

var trak = {

	init:			function() {

						// Default AJAX options
						//
						$.ajaxSetup({
						  url:		trak.url,
						  type:		'POST',
						  error:	function(http, message, exc) {
						  				// Needed to allow dialogs to close if there's been an error
						  				_rxChanged = 0;
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
						trak.support();
						trak.actions();
						trak.boot.login();


						 
					},
	boot:			{
	
		ok:			function(){


	try {

		trak.dialogFinish();
		//trak.support();
		//trak.actions();
		trak.fn.loginThrobberOff();
		$('#login-throbber').hide();
		if (trak.fn.readCookie('cookieSite') == null) {
				trak.refresh(1,1,0,0);
		} else {
				trak.refresh(trak.fn.readCookie('cookieSite'),trak.fn.readCookie('cookieWard'),0,0);
		};
		$('.hdrDialogButtons').buttonset().css('font-size','13px');		
		$('#hdrWardList div').button().css('font-size','14px').css('width','80px');
		$('#hdrFilterList div').button().css('font-size','14px').css('width','90px');
		$('.hdrSelWard').button().css('font-size','14px');
		$('.hdrFilter').button().css('font-size','14px');
		//intervalRefresh = setInterval(trak.interval,trak.refreshTime*1000);
		$('#trakButtons').fadeIn('slow');
		$('#_vWard').badger(trak.vw);
		window.onerror = function(msg, url, line) {
	   		trak.confirm('There was a javascript runtime error. Sorry.<p>[global:'+line+'] '+msg+'.</p>',220)
			//alert("Error: " + msg + "\nurl: " + url + "\nline #: " + line);
  			var suppressErrorAlert = true;
   			return suppressErrorAlert;
		};

	} catch(error) {
	   	trak.confirm('There was a javascript runtime error. Sorry.<p>[boot] '+error.message+'.</p>',220)
	};


				
		},
		reject:		function(){
		
			$("#formLogin input[name=pw]").effect("highlight", {color:'#FF0000'}, 'slow').val('').focus();
			trak.fn.loginThrobberOff();
			$('#login-throbber').hide();
		},
		login:		function(){
		
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
		logout:		function(){
		
			$('#trakButtons').hide('fast');
			$('.trakPatient').hide('fast',function(){
				$(this).remove();
			});
			delete __PW;
			trak.boot.login();
		
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
	dialogDocInit:		function() {
					if ($("#"+trak.dialogdoc).length == 0) {
				  		dialogdoc = $('<div id="'+trak.dialogdoc+'"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
				 	}
				 	else
				 	{
					 		// Temporary
					 		trak.dialogDocFinish();
				 	};
				},
	dialogDocFinish:	function() {
	
		dialogdoc.dialog("destroy");
		dialogdoc.remove();
	
					},
	refresh:		function(refreshSite,refreshWard,refreshFilter,refreshList) {

		var refreshTimeout = setTimeout(function(){
			$(".trakPatient").html('<tr><td><img src="gfx/fbThrobber.gif" /></td></tr>');
		},250);
	
		$.ajax({
			data:    	({
						act:	"write",
						site:	refreshSite,
						ward:	refreshWard,
						filter: refreshFilter,
						list:	refreshList,
						_pw:	Aes.Ctr.encrypt(__PW,__PW,256)
					 }),
			error:		function(){},
			statusCode: {
  				403:	function() {
    			  			clearTimeout(refreshTimeout);
    			  			sID=refreshSite;
							wID=refreshWard;
							fID=refreshFilter;
							lID=refreshList;
							trak.fn.createCookie('cookieSite',sID,28);
							trak.fn.createCookie('cookieWard',wID,28);	
    			  			trak.boot.logout();
    			  			trak.fn.statusMessageDialog("You've been logged out.");
    					},
  				200:	function(data) {
							trak.visRef=[];
							trak.jobsRefIDList=[];			  			
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
						aw:		$("#patBoxID_"+vid+" td:first-child").hasClass('_smallTag'),
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
						$('#_pn'+vid).find('dt').addClass('patient-demographics');
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
	
		isTouchDevice:	function() {

			return !!('ontouchstart' in window)
				|| !!('onmsgesturechange' in window);
			
		},
		decodeName:		function(id) {
		var _AESObj = $("#_pn"+id).find('dt');
		_AESObj.html(Aes.Ctr.decrypt(_AESObj.html(),__PW,256));
	
	},
		decode:			function(id) {
	
		var _AESObj = $(id);
		_AESObj.html(Aes.Ctr.decrypt(_AESObj.html(),__PW,256));
	
	},
		decodeVal:		function(id) {
	
		var _AESObj = $(id);
		_AESObj.val(Aes.Ctr.decrypt(_AESObj.val(),__PW,256));
	
	},
		tick:			function(id,Y,m,d,G,i,s) {
		
			$("#tCount_"+id).countdown({
			
				onTick:		trak.fn.longWait,
				serverSync:	trak.fn.serverTime,
				since:		new Date(Y,m,d,G,i,s),
				format:		'dHMS',
				layout:		'➘ {d<}{dn}d {d>}{hn}<span id="xpoint">{sep}</span>{mnn}<span id="xpoint">{sep}</span>{snn}'
			
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

	if ($('input[name=pmhxauto]').val() != '') {
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
 	};
   
   }).css({'font-size':'12px','padding-top':'2px','padding-bottom':'1px'});	
	$('input[name=pmhxauto]').autocomplete(
    {
			source: trak.url + "?act=ajax&type=nursing",
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

	if ($('input[name=activehxauto]').val() != '') {
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
	};
   
   }).css({'font-size':'12px','padding-top':'2px','padding-bottom':'1px'});
 $('input[name=activehxauto]').autocomplete(
    {
			source: trak.url + "?act=ajax&type=medic",
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
					
					},
					move:		function() {
					
						$('.patient-ward').button({icons:{primary:"ui-icon-tag"},text:true}).css('font-size','13px');
						$('.patient-bed').button({icons:{primary:"ui-icon-suitcase"},text:true}).css('font-size','13px');

					
					},	
					status:		function() {
						$('.ui-dialog-buttonpane').append('<div style="float:right;margin:.5em .6em .5em 0" class="patient-status">'+$('#_patient-status-code').attr('data-text')+'</div>');		
						$('.patient-status').button({icons:{primary:"ui-icon-key"}});									
					},
					jobstatus:	function() {
						$('.ui-dialog-buttonpane').append('<div style="float:right;margin:.5em .6em .5em 0" class="patient-jobstatus">'+$('#_patient-jobstatus-code').attr('data-text')+'</div>');		
						$('.patient-jobstatus').button({icons:{primary:"ui-icon-key"}});									
					},
					jobprint:	function() {
						$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .6em" class="patient-jobprint">Print</div>');		
						$('.patient-jobprint').button({icons:{primary:"ui-icon-print"}});									
					},
					jobaddsub:	function() {
						$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .3em" class="patient-job-subtype">Add</div>');		
						$('.patient-job-subtype').button({icons:{primary:"ui-icon-plus"}});									
					},
					jobrecipe:	function() {
						$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .3em" class="patient-job-recipe">Recipe</div>');		
						$('.patient-job-recipe').button({icons:{primary:"ui-icon-signal-diag"}});									
					},					
					scs:		function() {
					
					$('._scsButtonSelected').button({icons:{primary:"ui-icon-heart"}}).css('font-size','13px');
	 				$('input[name=triage]').click(function(){
	 					$('#_scs').html('');
	 				});				
					
					},
					savewarn:	function() {
					
					if (_rxChanged == 1) {
					 	trak.fn.statusMessageDialog("The record has been altered. Press <strong>Save</strong> to remember the changes or click ✖ again to discard them.");
 						_rxChanged = 0;
  						return false;
  					} else
  					{
  						return true;
  					};
					
					},
					savesetup:	function() {
					
					$(':input',$('#dialog')).click(function(){
	_rxChanged= 1;
});
					$(':input',$('#dialog')).change(function(){
	_rxChanged= 1;
});
					_rxChanged = 0;
					
					},
					dprintgp:	function() {
						$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .6em" class="patient-dischprint-gp">GP</div>');		
						$('.patient-dischprint-gp').button({icons:{primary:"ui-icon-print"}});									
					},
					dprintpat:	function() {
						$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .6em" class="patient-dischprint-pat">Patient</div>');		
						$('.patient-dischprint-pat').button({icons:{primary:"ui-icon-print"}});									
					},
		},
		name:			function(id) {
		
			return trak.fn.toTitleCase($('#_pn'+id).find('dt').html());
		
		},
		toTitleCase:	function(str) {

			return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});

		},
		calcScs:		function(_tri) {
				
				_total = 0;
				$('._scsButtonSelected').each(function(){	
					_total += Number($(this).attr('data-set'));				
				});
				$('#_scs').html(function(){
				
					if (_total.between(0,7))
					{
						if (_tri) { $('#triage3').attr('checked','checked').button('refresh'); };						
						return '<img style=\"margin-left:6px;margin-top:4px;\" src=\"gfx/green_light.png\" width=\"22\" height=\"22\">';
					};
					if (_total.between(8,11))
					{
						if (_tri) { $('#triage2').attr('checked','checked').button('refresh'); };
						return '<img style=\"margin-left:6px;margin-top:4px;\" src=\"gfx/yellow_light.png\" width=\"22\" height=\"22\">';
					};				
					if (_total.between(12,40))
					{
						if (_tri) { $('#triage1').attr('checked','checked').button('refresh'); };
						return '<img style=\"margin-left:6px;margin-top:4px;\" src=\"gfx/red_light.png\" width=\"22\" height=\"22\">';
					};
				});
		
		
		
		
		
		
		
		
		},
		loginThrobberOn:		function() {
			loginThrobberTimeout = setTimeout(function(){
				$('#login-throbber').show();
			},500);
		},
		loginThrobberOff:		function() {
			clearTimeout(loginThrobberTimeout);
		},
		statusMessage:			function(_message) {
		
//	         event: event.type,	
		
		
				$('#trakButtons').qtip({
	overwrite:	true,
	show: 		{

         ready: true
      },
    hide:	 	{
    	event:	'unfocus'
    },
    content:	{
      text: '<div id="_trakTip" style="text-align:center;">'+_message+'</div>',

  				 },
	position:	{
				viewport: $(window),
				my: 'top center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtStripe',
        		tip:	{
         				corner: true
         				}
      			},
    events:		{
    	render:	function() {
    				//$('.ui-tooltip-content',$('#trakButtons')).addClass('qtStripe');//.css('width','360px');
    				$('#_trakTip').button({icons:{primary:"ui-icon-info"}}).css('font-size','14px');
    				$('.ui-tooltip-content').css('max-width','1000px');


    			} 
    }
}).qtip('show');
window.setTimeout(function(){$('#trakButtons').qtip('destroy')}, 8000);
		
		
		
		},
		statusMessageDialog:	function(_message) {
		
	// This errors in Firefox	         event: event.type,
	try {	
		
				$('.ui-dialog-titlebar').qtip({
	overwrite:	true,
	show: 		{
         ready: true
      },
    hide:	 	{
    	event:	'unfocus'
    },
    content:	{
      text: '<div id="_trakTip" style="text-align:center;width:280px;">'+_message+'</div>',

  				 },
	position:	{
				viewport: $(window),
				my: 'top center',
        		at: 'bottom center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark',
        		tip:	{
         				corner: true
         				}
      			},
    events:		{
    	render:	function() {
    				$('.ui-tooltip-content').addClass('qtStripe');//.css('width','360px');
    				$('#_trakTip').button({icons:{primary:"ui-icon-info"}}).css('font-size','14px');
    				$('.ui-tooltip-content').css('max-width','1000px');


    			} 
    }
}).qtip('show');
				window.setTimeout(function(){$('.ui-dialog-titlebar').qtip('destroy')}, 8000);

		} catch(error) {
		
		};	
			
		},
		statusMessageDiv:		function(_div,_message) {
		
	// This errors in Firefox	         event: event.type,
	try {	
		
				$(_div).qtip({
	overwrite:	true,
	show: 		{
         ready: true
      },
    hide:	 	{
    	event:	'unfocus'
    },
    content:	{
      text: '<div id="_trakTip" style="text-align:center;width:280px;">'+_message+'</div>',

  				 },
	position:	{
				viewport: $(window),
				my: 'bottom center',
        		at: 'top center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark',
        		tip:	{
         				corner: true
         				}
      			},
    events:		{
    	render:	function() {
    				$('.ui-tooltip-content').addClass('qtStripe');//.css('width','360px');
    				$('#_trakTip').button({icons:{primary:"ui-icon-info"}}).css('font-size','14px');
    				$('.ui-tooltip-content').css('max-width','1000px');


    			} 
    }
}).qtip('show');
				window.setTimeout(function(){$(_div).qtip('destroy')}, 8000);

		} catch(error) {
		
		};	
			
		},
		buttonset:		{
		
			borderson:	function(id){
			
			$(id).find('.ui-buttonset').find('.ui-state-default').not('.ui-corner-left').css({"border-left-color":"#CCC"});
			$(id).find('.ui-buttonset').find('.ui-state-default').not('.ui-corner-right').css({"border-right-color":"#CCC"});			
			
			
			},
			bordersoff:	function(id){
			
			$(id).find('.ui-buttonset').find('.ui-state-disabled').not('.ui-corner-left').css({"border-left-color":"transparent"});
			$(id).find('.ui-buttonset').find('.ui-state-disabled').not('.ui-corner-right').css({"border-right-color":"transparent"});			

			
			}
		
		},
		discharge: 		function(fn_action) {
			
		$.ajax({

			data:    ({
						act:	 	"dbDiscPat",
						disctype:	1,
						id:			$("#discPat input[name=id]").val(),
						nid:		$("#discPat input[name=nid]").val(),
						add:		$("#discPat input[name=eddd]").val(),
						gpadv:		Aes.Ctr.encrypt(  $("#discPat textarea[name=gpadv]").val()  ,__PW,256),
						patadv:		Aes.Ctr.encrypt(  $("#discPat textarea[name=patadv]").val()  ,__PW,256),
						ccom:		Aes.Ctr.encrypt(  $("#discPat textarea[name=ccom]").val()  ,__PW,256),
						ddest:		$("#discPat input[name=patient-dischargedestination-code]").val(),
						rxchange:			$("#discPat input[name=rxchange]").val(),
						followup:	$("#discPat input[name=patient-followup-code]").val()
					 }),
			success: function(data) {
						fn_action(data);
						},
			error:	 function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					 }
					 
		}); // $.ajax	
					
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
													destSite:$('#addPat input[name=destSite]').val(),
													destWard:$('#addPat input[name=patient-ward-code]').val(),
													destBed: $('#addPat input[name=patient-bed-code]').val(),
													SBARs:	$('#addPat textarea[name=SBARs]').val(),
													SBARb:	$('#addPat textarea[name=SBARb]').val(),
													SBARr:	$('#addPat textarea[name=SBARr]').val(),
													ews:	$("#addPat input[name=patient-ews-code]").val(),
													dv:		$("#addPat input[name=dv]:checked").val(),
													bn:		$("#addPat input[name=bn]:checked").val(),
													consoc:	$('#addPat #_patient-consultants-oc-code').val(),
													_pw:	Aes.Ctr.encrypt(__PW,__PW,256)
												 }),
										success: function(data){

try {

var _data = jQuery.parseJSON(data);
if (_data.status==0)
{
 _type='predicted admissions';
}
else
{
 _type='referred patients';
};

_message = Aes.Ctr.decrypt(_data.name,__PW,256) + ' has been added to the ' + _type + ' list.';
trak.refresh(sID,wID,fID,lID);
trak.dialogFinish();
trak.fn.statusMessage(_message);

} catch(e)
{
	   			trak.confirm('There was a javascript runtime error. Sorry.<p>[add:save] '+e.message+'.</p>',220)

};

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
                movenew:	{

                    			Move:    function() {
                
									$(".ui-dialog-buttonpane button:contains('Move')").button("disable");
									$.ajax({
										data:    ({
													act:	 	"dbMovePat",
													movetype:	0,
													id:			$("#movePat input[name=id]").val(),
													nid:		$("#movePat input[name=nid]").val(),
													destSite:  	$('#movePat input[name=destSite]:checked').val(),
													destWard:  	$('#movePat input[name=patient-ward-code]').val(),												
													destBed:  	$('#movePat input[name=patient-bed-code]').val(),
													SBARs:	$('#movePat textarea[name=SBARs]').val(),
													SBARb:	$('#movePat textarea[name=SBARb]').val(),
													SBARr:	$('#movePat textarea[name=SBARr]').val(),
													pathway:	$('#movePat input[name=patient-pathway-code]').val(),
													nvwr:		$('#movePat input[name=nvwr]:checked').val()	
													
												 }),
										success: function(data){

try {

if (  (sID!=$('#movePat input[name=destSite]:checked').val()) || (wID!=$('#movePat input[name=patient-ward-code]').val())  ) {
	var _data = jQuery.parseJSON(data);
	_message = Aes.Ctr.decrypt(_data.name,__PW,256) + ' has been moved to ' + _data.destination + '.';
	trak.fn.statusMessage(_message);
};
trak.refresh(sID,wID,fID,lID);
$("#dialog").dialog("destroy").remove(); //dialogClose(dialog);

} catch(error) {

	trak.confirm('JSError: KSKF:' + error.message + '.',200);

};


															}
									}); // $.ajax
                


                },




                    			Predict: function() {
                					$(".ui-dialog-buttonpane button:contains('Predict')").button("disable");
									$.ajax({
										data:    ({
													act:	 	"dbMovePat",
													movetype:	1,
													id:			$("#movePat input[name=id]").val(),
													nid:		$("#movePat input[name=nid]").val(),
													destSite:  	$('#movePat input[name=destSite]:checked').val(),
													destWard:  	$('#movePat input[name=patient-ward-code]').val(),												
													destBed:  	$('#movePat input[name=patient-bed-code]').val(),
													SBARs:	$('#movePat textarea[name=SBARs]').val(),
													SBARb:	$('#movePat textarea[name=SBARb]').val(),
													SBARr:	$('#movePat textarea[name=SBARr]').val(),
													pathway:	$('#movePat input[name=patient-pathway-code]').val(),
													nvwr:		$('#movePat input[name=nvwr]:checked').val()
													
												 }),
										success: function(data){
//alert(data);
											//trak.refresh(sID,wID,fID,lID);
											trak.refreshRow($("#movePat input[name=id]").val());
                    						$("#dialog").dialog("destroy").remove(); //dialogClose(dialog);
															}
									}); // $.ajax
                
                
                
                    			}            			

                  		},
                edit:		{
 
                    			Alter:    function() {
                
//					if ($("#editPat").validationEngine('validate')) {

//									if (  $('#editPat input[name=nBed]:checked').val() == 0 ) {
// 										var destBed = 0;
// 										}
// 										else
// 										{
// 										var destBed = $("#editPat #nBedNum").val();
// 										};
 									$(".ui-dialog-buttonpane button:contains('Alter')").button("disable");
									
									$.ajax({
										data:    ({
													act:	 	"dbEditPat",
													id:			$("#editPat input[name=id]").val(),
													nid:		$("#editPat input[name=nid]").val(),
													pid:		$("#editPat input[name=pid]").val(),
													reftype:  	$('#editPat input[name=reftype]:checked').val(),
													destSite:  	$('#editPat input[name=destSite]:checked').val(),
													destWard:  	$('#editPat input[name=patient-ward-code]').val(),
													destBed:	$('#editPat input[name=patient-bed-code]').val(),									
													triage:		$('#editPat input[name=triage]:checked').val(),
													ews:		$('#editPat input[name=patient-ews-code]').val(),
													dv: 		$('#editPat input[name=dv]:checked').val(),
													bn: 		$('#editPat input[name=bn]:checked').val(),
													scs:		$('#_scsform').serialize()
													
												 }),
										success: function(data){

//alert(data);
try {

// Have we changed site?
if (  (sID!=$('#editPat input[name=destSite]:checked').val()) || (wID!=$('#editPat input[name=patient-ward-code]').val())  ) {
	// Yes
	var _data = jQuery.parseJSON(data);
	_message = Aes.Ctr.decrypt(_data.name,__PW,256) + ' will now be admitted to ' + _data.destination + '.';
	trak.fn.statusMessage(_message);
	trak.refresh(sID,wID,fID,lID);
}
else
{
	// No

	// Have we been admitted? reftype=2
	if ($('#editPat input[name=reftype]:checked').val()=='2') {
		// Yes
		var _data = jQuery.parseJSON(data);
		_message = Aes.Ctr.decrypt(_data.name,__PW,256) + ' has been admitted to ' + _data.destination + '.';
		trak.fn.statusMessage(_message);
		trak.refresh(sID,wID,fID,lID);		
	}
	else
	{
		// No
		trak.refreshRow($("#editPat input[name=id]").val());
	};



	
};
$("#dialog").dialog("destroy").remove();

} catch(error) {

	trak.confirm('JSError: ZJJA:' + error.message + '.',200);

};


										}

									}); // $.ajax
                
//                	} else
//					{
//									window.setTimeout(function(){$('#editPat').validationEngine('hideAll')}, 6000);
//					}; // validationEngine
                
                
                
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
		// These buttons may be disabled; they'll need to be enabled to allow the value to be submitted
		$('#jobButtons input[name=type]').button( "option", "disabled", false );
		// Extra styling to hide the flash of the buttons becoming active
		$('#jobButtons label').addClass( "ui-button-disabled ui-state-disabled" );

 		$.ajax({

										data:    ({
													act:	"dbAddJob",
													data:	Aes.Ctr.encrypt(  $("#addJob").serialize()  ,__PW,256),
													result:	Aes.Ctr.encrypt(  $('#addJobResult textarea[name=event_result]').val()  ,__PW,256),
													req:	Aes.Ctr.encrypt(  $("#joblist").serialize()  ,__PW,256),
													extras:	Aes.Ctr.encrypt(  $("#extraslist").serialize()  ,__PW,256)

													
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
						status:			$("#formUpdateRef input[name=patient-status-code]").val(),
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
trak.refreshRow($("#formUpdateRef input[name=formID_vid]").val());
$("#dialog").dialog("destroy").remove();
											
											
// diaRefID  = $("#formUpdateRef input[name=formID_refid]").val();
// diaVisID  = $("#formUpdateRef input[name=formID_vid]").val();
// diaStatID = $("#formUpdateRef input[name=status]:checked").val();
// 
// switch(diaStatID) {
// case '1':
// 	$("#refImg_" + diaRefID).removeClass('_R').css({opacity:1});
// 	break;
// case '2':
// 	$("#refImg_" + diaRefID).addClass('_R').css({opacity:1});
// 	break;
// case '4':
//  	$("#refImg_" + diaRefID).addClass('_R').css({opacity:0.4}); 
// 	break;
// 
// };
// 
// 
// if (  $("#formUpdateRef input[name=zwho]").val() == 1 ) { // Doctor
// 	$("#triage_" + diaVisID).hide();		   // Kill triage icon
// 	$("#tCount_" + diaVisID).countdown('destroy');
// 	$("#tCount_" + diaVisID).empty();
// };
// $("#dialog").dialog("destroy").remove();




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


 Save:    function() {
                    				
									//if ($("#formEditRx").validationEngine('validate')) {
									$.ajax({
										data:    ({
										
													act:	"dbEditNursing",
													data:	$("#formEditNursing").serialize(),
													pid:	$("#formEditNursing input[name=pid]").val(),
													vid:	$("#formEditNursing input[name=vid]").val(),
													rid:	$("#formEditNursing input[name=rid]").val(),
													pc:		$("#formEditNursing textarea[name=pc]").val(),
													wd:		$("#formEditNursing textarea[name=wd]").val(),
													plan:	$("#formEditNursing textarea[name=plan]").val(),
													jobs:	$("#formEditNursing textarea[name=jobs]").val(),
													
													ews:	$("#formEditNursing input[name=patient-ews-code]").val(),
													triage:	$("#formEditNursing input[name=triage]:checked").val(),
													resus:	$("#formEditNursing input[name=resus]:checked").val(),
													alert:	$("#formEditNursing input[name=alert]").val(),
													nid:	$("#formEditNursing input[name=nid]").val(),
													status:	$("#formEditNursing input[name=patient-status-code]").val(),
													frailty:	$('#formEditNursing input[name=patient-frailty-code]').val(),
													mobility:	$('#formEditNursing input[name=patient-mobility-code]').val(),
													nldc:	$('#_formnld').serialize(),
													scs:	$('#_scsform').serialize()

													
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
                    		 },
 							conphys:	{

 Save:    function() {
                    				


									//if ($("#formEditRx").validationEngine('validate')) {
									$.ajax({
										data:    ({
										
													act:	"dbEditCP",
													vid:	$('#formEditCP input[name=vid]').val(),
													pid:	$('#formEditCP input[name=pid]').val(),
													nid:	$('#formEditCP input[name=nid]').val(),
													data:	$("#formEditCP").serialize(),
													rid:	$("#formEditCP input[name=rid]").val(),											
													resus:	$("#formEditCP input[name=resus]:checked").val(),
													nld:	$("#formEditCP input[name=nld]:checked").val(),
													board:	$("#formEditCP input[name=board]:checked").val(),
													alert:	$("#formEditCP input[name=alert]").val(),
													status:	$("#formEditCP input[name=patient-status-code]").val(),
													coc:	$('#formEditCP input[name=patient-consultants-oc-code]').val(),
													cmau:	$('#formEditCP input[name=patient-consultants-mau-code]').val(),
													sugw:	$('#formEditCP input[name=suggested-ward-code]').val(),
													eddd:	$('#formEditCP input[name=eddd]').val(),
													ambu:	$('#formEditCP input[name=patient-pathway-code]').val(),
													nldc:	$('#_formnld').serialize()

												 }),
										success: function(data){
//alert(data);
_rxChanged = 0;//alert(data);
											//trakRefresh(sID,wID,fID,lID);
											trak.refreshRow($("#formEditCP input[name=vid]").val());
											$("#dialog").dialog("destroy").remove();

															}
									}); // $.ajax
											//} else
									//{
									//	window.setTimeout(function(){$('#formEditRx').validationEngine('hideAll')}, 6000);
									//}; // validationEngine
                    			}
                    		 },
 							doctor:		{

 Save:    function() {
                    				


									if ($("#formEditDoc").validationEngine('validate')) {
									$.ajax({
										data:    ({
										
													act:	"dbEditDoc",
													vid:	$('#formEditDoc input[name=vid]').val(),
													pid:	$('#formEditDoc input[name=pid]').val(),
													nid:	$('#formEditDoc input[name=nid]').val(),
													data:	$("#formEditDoc").serialize(),
													rid:	$("#formEditDoc input[name=rid]").val(),
													board:	$("#formEditDoc input[name=board]:checked").val(),
													alert:	$("#formEditDoc input[name=alert]").val(),
													status:	$("#formEditDoc input[name=patient-status-code]").val(),
													edd:	$('#formEditDoc input[name=edd]:checked').val(),
													eotbt:	$("#formEditDoc input[name=patient-eotbt-code]").val(),
													ambu:	$("#formEditDoc input[name=patient-pathway-code]").val(),
													ho:		$("#formEditDoc input[name=ho]:checked").val(),
													hodet:	$("#formEditDoc textarea[name=hodetails]").val()

												 }),
										success: function(data){
//alert(data);
_rxChanged = 0;
											//trakRefresh(sID,wID,fID,lID);
											trak.refreshRow($("#formEditDoc input[name=vid]").val());
											$("#dialog").dialog("destroy").remove();

															}
									}); // $.ajax
											} else
									{
										window.setTimeout(function(){$('#formEditDoc').validationEngine('hideAll')}, 6000);
									}; // validationEngine
                    			}
                    		 } 
 
 
 							},
 				discharge:	{
  
	Save: function() {

		if ($("#discPat").validationEngine('validate')) {

			trak.fn.discharge(function(){
				trak.refreshRow($("#discPat input[name=id]").val());
				$("#dialog").dialog("destroy").remove();		
			});

		}
		else
		{

			window.setTimeout(function(){$('#discPat').validationEngine('hideAll')}, 6000);

		}; // validationEngine

	}

  },
 				beds:		{},
 				demo:		{

Save: function() {

 if ($("#formEditDemo").validationEngine('validate')) {
		$(".ui-dialog-buttonpane button:contains('Save')").button("disable");

 		$.ajax({

										data:    ({
													act:	"dbEditDemo",
													data:	Aes.Ctr.encrypt(  $("#formEditDemo").serialize()  ,__PW,256),

												 }),
										success: function(data){

											//alert(data);
											var _vID = $("#formEditDemo input[name=vid]").val();
											trak.refreshRow(_vID);
											$("#dialog").dialog("destroy").remove();

															}
															
									}); // $.ajax

 } else
 {
	window.setTimeout(function(){$('#formEditDemo').validationEngine('hideAll')}, 6000);
 }; // validationEngine


	}
 				
 				}
	
				},
	dialogs:		{
	
		note:	{
  close: function(){
  	$('#formAddNote').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  width:640,
  height:410,
  modal: true,
  beforeClose: function(){
  	return trak.fn.forms.savewarn();
  },
  open: function(){
  	$('.ui-button').blur();
  },
  create:	function() {
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/Notebook.png"></div>');

  },
  xbuttons:  function() {return this.buttons.notes;}
 }
	
	},
	support:		function() {

try {
	
$(".clickSite").live('click',function(){
//Add patieint window
	var siteID = $(this).val();
//	if (siteID != 99) {
	 // ajax stuff for form update

            
							$.ajax({
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
						$('#hdrWardList div').button().css('font-size','14px').css('width','80px');
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
						$('#hdrFilterList .hdrWideButtons2').button().css('font-size','14px').css('width','90px');
						$( ".hdrFilter" ).button( "option", "label", "All" );
						$('.hdrFilter').fadeIn('fast');
						
						$('#_vWard').badger($('#_vWard').attr('data-number'));
						
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

if (!trak.fn.isTouchDevice()) {

	//lID   = $(this).attr("rel");
	fName = $(this).find('.ui-button-text').html();
	lName = $(this).attr('data-file');
	$("#action-pathways").qtip('hide'); // otherwise it hangs around too long
 trak.dialogInit();
 dialog.dialog({
  title: fName,
  close: function() {
  	trak.dialogFinish();
  },
  width:800,
  height:600,
  modal: true,
  oldopen: function(){  	
    var fp = new FlexPaperViewer(	
		 'lib/flexpaper/FlexPaperViewer',
		 'dialog', { config : {
		 SwfFile : escape(trak.url + "/../pathways/"+lName),
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
  open: function(){  	

    $('#dialog').FlexPaperViewer(
            { config : {

                SWFFile : escape(trak.url + "/../pathways/"+lName),
				jsDirectory: 'lib/flexpaper/js/',
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
                RenderingOrder : 'flash,html',
                StartAtPage : '',
                ViewModeToolsVisible : true,
                ZoomToolsVisible : true,
                NavToolsVisible : true,
                CursorToolsVisible : true,
                SearchToolsVisible : true,
                WMode : 'window',
                localeChain: 'en_US'
            }}
    );

//     var fp = new FlexPaperViewer(	
// 		 'lib/flexpaper/FlexPaperViewer',
// 		 'dialog', { config : {
// 		 SwfFile : escape(trak.url + "/../pathways/"+lName),
// 		 Scale : 1.2, 
// 		 ZoomTransition : 'easeOut',
// 		 ZoomTime : 0.5,
// 		 ZoomInterval : 0.2,
// 		 FitPageOnLoad : false,
// 		 FitWidthOnLoad : true,
// 		 FullScreenAsMaxWindow : false,
// 		 ProgressiveLoading : true,
// 		 MinZoomSize : 0.2,
// 		 MaxZoomSize : 5,
// 		 SearchMatchAll : false,
// 		 InitViewMode : 'Portrait',
// 		 PrintPaperAsBitmap : false,
// 		 
// 		 ViewModeToolsVisible : true,
// 		 ZoomToolsVisible : true,
// 		 NavToolsVisible : true,
// 		 CursorToolsVisible : true,
// 		 SearchToolsVisible : true,
// 		
// 		 localeChain: 'en_US'
// 		 }});

  },
  xpdfopen: function(){
  
  var myPDF = new PDFObject({
  url: trak.url + "/../pathways/"+lName,
  pdfOpenParams: {
    navpanes: 1,
    statusbar: 0,
    view: "FitH",
    pagemode: "thumbs"
  }
}).embed("dialog");
  
  
  
  }
 }).css('overflow','hidden');

} else {

	trak.fn.statusMessage("Adobe Flash is needed to show this. Try a computer rather than an iPad.");

};
 
});
$('.hdrWideButtons5').live('click',function(){

	$(".patient-documents").qtip('hide');

 try {
 	_name = trak.fn.name($(this).attr('data-visitid'));
	_desc = $(this).attr('data-description');
	_text = _desc + ' for ' + _name;
 } catch(e)
 {
 	_text = $(this).attr('data-description');
 };
 trak.dialogDocInit();
 	$("#action-pathways").qtip('hide'); // otherwise it hangs around too long
 dialogdoc.dialog({
  title: 'Working...',
  close: function(){
  	trak.dialogDocFinish();
  },
  width:800,
  height:600,
  modal: true
 }).load(trak.url,{
 
 	vid:	$(this).attr('data-visitid'),
 	act:	'document',
 	type:	$(this).attr('data-type'),
 	file:	$(this).attr('data-file')
 
 },function(){
 	dialogdoc.dialog("option","title", _text); 
 });
 return false;
}); // qTip for Documents


$('.hdrWideButtons7').live('click',function(){

_id = $(this).attr('data-code');
_name = $(this).attr('data-name');

//alert(_id);

$('#_patient-consultants-oc-code').val(_id).change();
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

$('.hdrWideButtons6').live('click',function(){

_id = $(this).attr('data-code');
_name = $(this).attr('data-name');

//alert(_id);

$('#_patient-consultants-mau-code').val(_id).change();
$('#_patient-consultants-mau').button('option','label',_name).button('refresh');
$(".patient-consultants-mau").qtip('hide');

}); // qTip for On-call consultants
$('.hdrWideButtons9').live('click',function(){

_id = $(this).attr('data-code');
_name = $(this).attr('data-name');

//alert(_id);

$('#_suggested-ward-code').val(_id).change();
$('#_suggested-ward').button('option','label',_name).button('refresh');
$(".suggested-ward").qtip('hide');
if (_id == 126) {
	$('#edd1').click();
};



}); // qTip for On-call consultants
$('.hdrWideButtons10').live('click',function(){

_id = $(this).attr('data-code');
_name = $(this).attr('data-name');

//alert(_id);

$('#_patient-frailty-code').val(_id).change();
$('#_patient-frailty').button('option','label',_name).button('refresh');
$(".patient-frailty").qtip('hide');

}); // qTip for On-call consultants
$('.hdrWideButtons11').live('click',function(){

_id = $(this).attr('data-code');
_name = $(this).attr('data-name');

//alert(_id);

$('#_patient-mobility-code').val(_id).change();
$('#_patient-mobility').button('option','label',_name).button('refresh');
$(".patient-mobility").qtip('hide');

}); // qTip for On-call consultants
$('.note-jump').live('click',function(){

	_jump = '#' + $(this).attr('data-jump'); 
 	$('.notePaper').scrollTo(_jump, '100%', {onAfter: function(){
 		$(_jump).effect("highlight", {color:'#FF0000'}, 'slow');
 	}});
 
 });
$('.note-top').live('click',function(){

 	$('.notePaper').scrollTo(0,0);
 
 });
$('.hdrWideButtons15').live('click',function(){

_id = $(this).attr('data-ews');
$('#_patient-ews-code').val(_id);
$('#_patient-ews').button('option','label',_id).button('refresh');
$(".patient-ews").qtip('hide');

});
$('.hdrWideButtons16').live('click',function(){

_id = $(this).attr('data-status');
_text = $(this).attr('data-text');
$('#_patient-status-code').val(_id).change();
$('.patient-status').button('option','label',_text).button('refresh');
$(".patient-status").qtip('hide');

});
$('.hdrWideButtons17').live('click',function(){

_id = $(this).attr('data-code');
_text = $(this).attr('data-text');
$('#_patient-eotbt-code').val(_id).change();
$('.patient-eotbt').button('option','label',_text).button('refresh');
$(".patient-eotbt").qtip('hide');

});
$('.hdrWideButtons18').live('click',function(){

_id = $(this).attr('data-code');
_text = $(this).attr('data-text');
$('#_patient-pathway-code').val(_id).change();
$('.patient-pathway').button('option','label',_text).button('refresh');
$(".patient-pathway").qtip('hide');

});
$('._refsOverflow').live('mouseover mouseout', function(event) {
  if (event.type == 'mouseover') {
    // do something on mouseover
	_refsWidth	= $(this).css('width');
	_refsHeight	= $(this).css('height');
	_num		= $(this).attr('data-number');
	_height		= (Math.floor(_num/8)+1)*parseInt(_refsHeight);
	$(this).css({

		'height'	:	_height+'px',
		'overflow'	:	'visible',
		'position'	:	'absolute',
		'z-index'	:	'3',
		'width'		:	_refsWidth,
		'background-color':	'rgba(255,255,255,0.9)'
		
	});
	//$('._stat',$(this).parent()).hide();
	$('._stat',$(this).parent()).css('visibility','hidden');
	if ($.browser.mozilla) {
		$(this).parent().attr('style', 'height:77.5px;');
	};

  } else {
    // do something on mouseout
	$(this).css({

		'height'	:	'42px',
		'overflow'	:	'hidden',
		'position'	:	'relative',
		'z-index'	:	'1',
		'width'		:	'',
		'background-color':	'rgba(255,255,255,0.75)'
		
	});
	//$('._stat',$(this).parent()).show();
	$('._stat',$(this).parent()).css('visibility','visible');
  }
});
$('._notesOverflow').live('mouseover mouseout', function(event) {
  if (event.type == 'mouseover') {
    // do something on mouseover
	_refsWidth	= $(this).css('width');
	_refsHeight	= $(this).css('height');
	_num		= $(this).attr('data-number');
	_height		= (Math.floor(_num/4)+1)*parseInt(_refsHeight);
	
	$(this).css({

		'height'	:	_height+'px',
		'overflow'	:	'visible',
		'position'	:	'absolute',
		'z-index'	:	'3',
		'width'		:	_refsWidth,
		'background-color':	'rgba(255,255,255,0.9)'
		
	});
		if ($.browser.mozilla) {
		$(this).parent().attr('style', 'height:77.5px;');
	};
	//$('._stat',$(this).parent()).hide();
	$('._stat',$(this).parent()).css('visibility','hidden');
  } else {
    // do something on mouseout
	$(this).css({

		'height'	:	'42px',
		'overflow'	:	'hidden',
		'position'	:	'relative',
		'z-index'	:	'1',
		'width'		:	'',
		'background-color':	'rgba(255,255,255,0.75)'
		
	});
	//$('._stat',$(this).parent()).show();
	$('._stat',$(this).parent()).css('visibility','visible'); 
  }
});
$('.hdrWideButtons19').live('click',function(){

_id = $(this).attr('data-code');
_text = $(this).attr('data-text');
$('#_patient-jobstatus-code').val(_id);
$('.patient-jobstatus').button('option','label',_text).button('refresh');
$(".patient-jobstatus").qtip('hide');

});
$('.hdrWideButtons20').live('click',function(){

_id = $(this).attr('data-code');
_text = $(this).attr('data-name');
$('#_patient-dischargedestination-code').val(_id).change();
$('.patient-dischargedestination').button('option','label',_text).button('refresh');
$(".patient-dischargedestination").qtip('hide');

});
$('.hdrWideButtons21').live('click',function(){

_id = $(this).attr('data-code');
_text = $(this).attr('data-name');
$('#_patient-followup-code').val(_id).change();
$('.patient-followup').button('option','label',_text).button('refresh');
$(".patient-followup").qtip('hide');

});
$('.hdrWideButtons22').live('click',function(){

_id = $(this).attr('data-code');
_text = $(this).attr('data-text');
_width = $(this).attr('data-width');

$('#ixlist').append(function(){

return '<div data-id="'+_id+'" class="_cond hdrWideButtons23">'+_text+'<a class="_R" href="#">✕</a><input type="hidden" name="ixid" value="'+_id+'"><input type="hidden" name="ixres" value=""><input type="hidden" name="ixtxt" value="'+_text+'"></div>';

});

			$('#joblist ._cond ._R').last().hover(function(){
   				$(this).parent().addClass("_drughover");
  			},function(){
   				$(this).parent().removeClass("_drughover");
   			}).click(function(){
      			$(this).parent().remove();			
   			});

$(".patient-job-subtype").qtip('hide');

});

$('.hdrWideButtons24').live('click',function(){
	fID   = $(this).attr("data-code");
	fName = $(this).attr('data-name');
	$( ".hdrFilter" ).button( "option", "label", fName );
	$("#action-lists").qtip('hide');
	$("#lists-other").qtip('hide');
	$("#lists-bydestination").qtip('hide');
    trak.refresh(sID,wID,fID,405);

}); // qTip for destination filter
$('.hdrWideButtons25').live('click',function(){

_list = eval($(this).attr('data-list'));
for (var i in _list)
{
	_ix = _list[i].split(':');
	$('#ixlist').append('<div data-id="'+_ix[0]+'" class="_cond hdrWideButtons23">'+_ix[1]+'<a class="_R" href="#">✕</a><input type="hidden" name="ixid" value="'+_ix[0]+'"><input type="hidden" name="ixres" value=""><input type="hidden" name="ixtxt" value="'+_ix[1]+'"></div>');
	$('#ixlist ._cond ._R').last().hover(function(){
   				$(this).parent().addClass("_drughover");
  			},function(){
   				$(this).parent().removeClass("_drughover");
   			}).click(function(){
      			$(this).parent().remove();			
   			});
};
$(".patient-job-recipe").qtip('hide');
});

$('.patient-jobprint').live('click',function(){

// Copy of .hdrWideButtons5

 //_name = trak.fn.name($(this).attr('data-visitid'));
 //_desc = $(this).attr('data-description');
 trak.dialogDocInit();
 dialogdoc.dialog({
  title: 'Working...',
  close: function(){
  	trak.dialogDocFinish();
  },
  width:800,
  height:600,
  modal: true
 }).load(trak.url,{
 
 	vid:	$('#addJob input[name=vID]').val(),
 	act:	'document',
 	type:	127,
 	task:	$('#addJob input[name=type]:checked').val(),
 	data:	$('#joblist').serialize(),
 	clin:	$('#addJob textarea[name=event_desc]').val(),
 	extras:	$('#extraslist').serialize(),
 
 },function(){
 	//dialogdoc.dialog("option","title", _desc + ' for ' + _name); 
 });
 return false;
});
$('._scsButton').live('click',function(){

			var _attr = $(this).attr('data-type'); var _aval = _attr.substr(0,2);
			$('#scsDefault_'+$(this).attr('data-type')).attr('data-set',$(this).attr('data-value'));
			$('input[name=\"_'+ _aval +'\"]').val($(this).attr('data-choice'));
			$('#scsDefault_'+$(this).attr('data-type')).button('option','label',$('.ui-button-text',this).html());
			$('#scsDefault_'+$(this).attr('data-type')).qtip('hide');
			trak.fn.calcScs(true);
	
	 });
	
$('._scsButtonSelected').live('click',function(){
	$(this).qtip({
	overwrite:	true,
	hide:	 	{
    	event:	'unfocus'
    },
	show: 		{
		event:	'click',
		ready:	true
      },
	content:	{
      text: $('#id_'+$(this).attr('data-type'))
      },
	position:	{
				viewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				width:	200,
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				}
      			},
    events:		{
		render:	function(event,api){

$('._scsButton').button({icons:{primary:'ui-icon-link'}}).css('font-size','13px').css('width','180px').css('text-align','left');

}
    }
})});	
	
	
	
	
	
	
	
	 
	 
		} catch(error) {
	   			trak.confirm('There was a javascript initialisation error. Sorry.<p>[trak.support] '+error.message+'.</p>',220)		
		};


	},
	actions:		function() {
	
		try {
	
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
  			$("#lists-sub div").not('._all').css({"font-size":"14px","width":"200px","text-align":"left"}).button({icons:{primary:"ui-icon-star"}});
  			$("#lists-sub div._all").css({"font-size":"14px","width":"200px","text-align":"left"}).button({icons:{primary:"ui-icon-search"}});
			$('.hdrWideButtons3',$('#lists-sub')).each(function(){
				if ($(this).attr('data-number') != '0') {
					$(this).badger($(this).attr('data-number'));
				};
			});
			$("#action-lists").qtip('reposition');
			//$('#makeFlash').addClass('_fl');
			$('._buttonfl').find('.badger-outter').addClass('_fl');
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
    					type:	"pathways",
    					touch:	trak.fn.isTouchDevice()
         		},
         success:	function(data, status) {
         	this.set('content.text', data);
    		$("#pathways .hdrWideButtons4").css({"font-size":"14px","width":function(){return $(this).attr('data-width');},"text-align":"left"}).button({icons:{primary:"ui-icon-clipboard"}});
    		$("#pathways .hdrWideButtons5").css({"font-size":"14px","width":function(){return $(this).attr('data-width');},"text-align":"left"}).button({icons:{primary:"ui-icon-clipboard"}});
       		$("#action-pathways").qtip('reposition');
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

var _patientList = new Array();
$('.patient-toggle').each(function(){
	_patientList.push( $(this).find('img').attr('rel') );
});

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
 	viewType:	'google',
 	pid:		_patientList
 
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
  width:718,
  height:450,
  modal: true,
  create:	function() {
						  
		// $('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/user_accept.png"></div><div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Details</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Demographics</label><input type="radio" value="3" name="db" id="db3" /><label for="db3">Destination</label></div><div id="add-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		// $(".db").buttonset();
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/user_accept.png"></div><div id="add-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');


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
	$('#_patient-ews').button({icons:{primary:"ui-icon-alert"}}).css('font-size','13px');
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
	$("#addPat input[name=pas]").focus().ForceNumericOnly();
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
	$("#_type, #_ews, #_dv, #_bn").css('font-size','13px');
	$('#_patient-consultants-oc').button({icons:{primary:"ui-icon-person"}});
	trak.fn.forms.move();
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
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/Notebook.png"></div><div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Bed state</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Trigger clocks</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
						  
						  
  },
  width:900,
  height:500,
  title:'Tools',
  modal: true,
  buttons: trak.buttons.viewnotes
 }).load(trak.url,
 {
 			act:	"bedbash",
 			ssite:	sID,
 			sward:	wID

 },function(){

 			$('.db input[name=db]').click(function(){

				if ($(this).val() == 1)
				{
					$('#_bedbash').fadeIn('fast');
					$('#_triggers').hide();



				};
				if ($(this).val() == 2)
				{
					$('#_bedbash').hide();
					$('#_triggers').fadeIn('fast');
					$('#example').gauge('draw');
					
					$('._gauge').each(function(){
						_struct = $(this);
						_struct.gauge('setValue',_struct.attr('data-value'));					
					});
												
				};
	 		});


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
			$('.patient-move').live('click',function() {

 
 				 _name = trak.fn.name($(this).attr('data-visitid'));		
				 trak.dialogInit();
				 dialog.dialog({
				  close: function(){
				  
					// $('#movePat').validationEngine('hideAll');
					trak.dialogFinish();
					
				  },
				  width:384,
				    open: function(){
  	$('.ui-button').blur();
  },
				  create:	function(){
  		$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Destination</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">SBAR</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
	},
				  height:400,
				  modal: true,
				  buttons: trak.buttons.movenew
				 }).load(trak.url,{
				 
					act:		'formMovePatNew',
					vid:		$(this).attr('data-visitid')
					 
				 },function(){
					

					dialog.dialog("option","title",'Move ' + _name);
					// $("#movePat").validationEngine('init');
					// $("#movePat").validationEngine('attach', {scroll: false,validationEventTrigger: ''});
					$('.dialogButtons').buttonset().css('font-size','13px');

	 			$('.db input[name=db]').click(function(){

				if ($(this).val() == 1)
				{
					
					$('#_sbar').hide();$('#_dest').fadeIn('fast');
					
				};
				if ($(this).val() == 2)
				{
					
					$('#_dest').hide();		$('#_sbar').fadeIn('fast');							
				};
	 		});			
				$('#_patient-pathway').button({icons:{primary:"ui-icon-contact"}}).css('font-size','13px');
					//$('#_avail').css('font-size','13px').button();
	
	if ($('#_patient-bed-code').val() == '127') {

 	$('#movePat input[name=nvwr]').prop("disabled",false).addClass('validate[required,groupRequired[nvwr]]').button('refresh');
 	$('#_patient-pathway').button('enable');
	
	}
	else
	{
	
 	$('#movePat input[name=nvwr]').prop("disabled",true).removeClass('validate[required,groupRequired[nvwr]]').button('refresh');
 	$('#_patient-pathway').button('disable');

trak.fn.buttonset.bordersoff('fieldset[name=_ambu]');

	};
	
					
					//$('.patient-ward').button({icons:{primary:"ui-icon-tag"},text:true}).css('font-size','13px');
					//$('.patient-bed').button({icons:{primary:"ui-icon-suitcase"},text:true}).css('font-size','13px');
					trak.fn.forms.move();

				 });
				 return false;
				});
			$(".patient-jobs").live('click',function(){


 var _jid = $(this).attr('data-jobid');
 trak.dialogInit();
 dialog.dialog({
  title: '',
  xtitle: function(){
  alert($(this).attr('data-jobid'));
  	if ($(this).attr('data-jobid') != '') {
  		return 'Edit a job';
  	}
  	else
  	{
  		return 'Add a new job!';
  	};
  
  },
  close: function(){
  	$('#addJob').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  beforeClose: function(){
  	return trak.fn.forms.savewarn();
  },
  width:720,
  height:410,
  xheight:410,
  modal: true,
  open: function(){
  	$('.ui-button').blur();
  	
  },
  create:	function() {
						  
		$('.ui-dialog-buttonpane').append('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/job.png"></div><div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Job</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Result</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
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
 			var _selected = '';
 			trak.fn.forms.jobstatus();
 			trak.fn.forms.jobprint();
 			trak.fn.forms.savesetup();
 
		 	$('.dialogButtons').buttonset().css('font-size','12px');
 			$('.dialogButtons#jobButtons .ui-button-text').removeClass('ui-button-text').addClass('refButtonsPad');
			//$('.hdrWideButtons23').css({"font-size":"13px","margin-bottom":"0.2em","text-align":"left"}).button({icons:{primary:"ui-icon-script"}});
			$('.db input[name=db]').click(function(){

				if ($(this).val() == 1)
				{
					$('#_jobdata').show();
					$('#addJobResult').hide();
				};
				if ($(this).val() == 2)
				{
					$('#_jobdata').hide();
					$('#addJobResult').show();									
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


			$('#joblist ._cond ._R').hover(function(){
   				$(this).parent().addClass("_drughover");
  			},function(){
   				$(this).parent().removeClass("_drughover");
   			}).click(function(){
      			$(this).parent().remove();			
   			});



			$(".refButtonsPad").hover(function(){
				$('#_jobDesc').html( ' <span style="color:#AAA;">' + $(this).find('img').attr('data-desc') + '</span>' );},function(){
			
				$('#_jobDesc').html( ' <span style="color:#AAA;">' + _selected + '</span>' );
			
			}).click(function(){
				var _selected	=	$(this).find('img').attr('data-desc');
 				var _pressed	=	$(this).find('img').attr('data-type');
 				$('#_jobDesc').html( ' <span style="color:#AAA;">' + _selected + '</span>' );
 				$('#extraslist').load(trak.url,{
 
				 	act:	'ajax',
 					type:	'jobextras',
 					job:	function(){ return _pressed }
 
				},function(){
					$('#extraslist .dialogButtons').buttonset().css('font-size','12px');
				});
				$('#ixlist').empty();
  			});
  			
  			$('#addJob input[name=type]').change(function(){
  				if ($(this).val() == '1') {
  					$('.patient-job-recipe').button('enable');
				} else {
  					$('.patient-job-recipe').button('disable');				
				};
  			});
 	trak.fn.forms.jobaddsub(); trak.fn.forms.jobrecipe();
 if ($('#addJob input[name=type]:checked').val() == '1' )
 {
   					$('.patient-job-recipe').button('enable');
 }
 else
 {
   					$('.patient-job-recipe').button('disable');	
 };		

 
 	
//  	 			if ($('#addJob input[name=type]:checked').val() == '1') {
//   					$('.patient-job-recipe').button('enable');
// 				} else {
//   					$('.patient-job-recipe').button('disable');				
// 				};
 	
 
 			//$('.patient-job-subtype').css({"font-size":"13px","text-align":"left"}).button({icons:{primary:"ui-icon-script"}});

	if (_jid !=undefined) {
		$('#jobButtons input[name=type]').button( "option", "disabled", true ).button("refresh");
			// adapted from trak.fn.buttonset.bordersoff
			$('#jobButtons').find('.ui-state-disabled').not('.ui-corner-left').css({"border-left-color":"transparent"});
			$('#jobButtons').find('.ui-state-disabled').not('.ui-corner-right').css({"border-right-color":"transparent"});			


		_selected=$('#addJob').attr('data-desc');
		$('#_jobDesc').html( ' <span style="color:#AAA;">' + _selected + '</span>' );
		$(".refButtonsPad").off('click');
		dialog.dialog("option","title",$('#addJob').attr('data-desc'));
	} else {
		dialog.dialog("option","title",'Add job');
	};


 });
 return false;

	});
			$('.-old-patient-move').live('click',function() {
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
 				_name = trak.fn.name($(this).attr('data-visitid'));
 				trak.dialogInit();
				dialog.dialog({
				  close: function(){
						$('#editPat').validationEngine('hideAll');
						trak.dialogFinish();
				  },
				  open: function(){
  	$('.ui-button').blur();
  },
				  width:660,
				  height:460,
				  modal: true,
				  buttons: trak.buttons.edit
				 }).load(trak.url,{
				 
					act:		'formEditPat',
					vid:		$(this).attr('data-visitid')
					 
				}, function(){
					dialog.dialog("option","title",'Alter referral for ' + _name);
					// $("#editPat").validationEngine('init');
					// $("#editPat").validationEngine('attach', {scroll: false,validationEventTrigger: ''});
					$(".dialogButtons").buttonset().css('font-size','13px');;
					// if (  $('#editPat input[name=nBed]:checked').val() == 0 ) {
					//	$("#editPat #nBedNum").attr("disabled", true).css({opacity:0.6});
					// };

					trak.fn.forms.move();
					trak.fn.forms.scs();
					trak.fn.calcScs(false);
					$('#_patient-ews').button({icons:{primary:"ui-icon-alert"}}).css('font-size','13px');
				 });
 				return false;
			});
			$('.patient-note').live('click',function() {

 if ($(this).attr('data-noteid') != undefined) {
	dialog.dialog( "option", "hide", "fade" );
	trak.dialogFinish();
	trak.dialogs.note.show = 'fade';
};
 trak.dialogInit();
 trak.dialogs.note.buttons = trak.buttons.notes; // bodge; can't reference object from object
 dialog.dialog(trak.dialogs.note).load(trak.url,
 {

	act:	'formAddNote',
	vid:	$(this).attr('data-visitid'),
 	id:		$(this).attr('data-noteid') 
 	
 },function()
 {
  dialog.dialog("option","title",'Entry for ' + $('#formAddNote').attr('rel'));
  trak.fn.decode('#formAddNote textarea[name=formID_note]');
  trak.fn.forms.savesetup();
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
		
		$('#_pn'+sid).find('dt').addClass('patient-demographics');
		
		$('.patient-toggle').each(function() {
			hid = $(this).find('img').attr('rel');
		 	if (sid == hid) {
				$('#patBoxID_'+hid).fadeTo('fast',1);
				if ($('#patBoxID_'+hid).hasClass('_dull')) {
			 		$('#patBoxID_'+hid).removeClass('_dull').addClass('x_dull');
		   		}

//new
if ($('#patBoxRefID_'+hid+' ._refs').hasClass("x_refsOverflow"))
{
	$('#patBoxRefID_'+hid+' ._refs').removeClass('x_refsOverflow').addClass('_refsOverflow');
};
if ($('#noteTD_'+hid+' ._notes').hasClass('x_notesOverflow'))
{
	$('#noteTD_'+hid+' ._notes').removeClass('x_notesOverflow').addClass('_notesOverflow');
};




		 	} else { 
				$('#patBoxID_'+hid).fadeTo('slow',0.75);


//new
if ($('#patBoxRefID_'+hid+' ._refs').hasClass("_refsOverflow"))
{
	$('#patBoxRefID_'+hid+' ._refs').removeClass('_refsOverflow').addClass('x_refsOverflow');
};
if ($('#noteTD_'+hid+' ._notes').hasClass('_notesOverflow'))
{
	$('#noteTD_'+hid+' ._notes').removeClass('_notesOverflow').addClass('x_notesOverflow');
};



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
 
    	
				$(".patient-discharge").button({icons:{primary:"ui-icon-trash"},text:true});
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
			$('.patient-sbar').button({icons:{primary:"ui-icon-comment"},text:true});
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
			$('#_pn'+sid).find('dt').removeClass('patient-demographics');
		
		$('.patient-toggle').each(function() {
			hid = $(this).find('img').attr('rel');
//		$('#_pn'+hid).find('dt').removeClass('patient-demographics');
//new
if ($('#patBoxRefID_'+hid+' ._refs').hasClass("x_refsOverflow"))
{
	$('#patBoxRefID_'+hid+' ._refs').removeClass('x_refsOverflow').addClass('_refsOverflow');
};
if ($('#noteTD_'+hid+' ._notes').hasClass('x_notesOverflow'))
{
	$('#noteTD_'+hid+' ._notes').removeClass('x_notesOverflow').addClass('_notesOverflow');
};



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
			$('#_pn'+lid).find('dt').removeClass('patient-demographics');
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
			buttons: trak.buttons.refer.han
		}).load(trak.url,{
		
			act:	'formAddRef',
			vid:	$(this).attr('data-visitid'),
			type:	127		
		
		},function()
		{
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
			beforeClose: function(){
  	return trak.fn.forms.savewarn();
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
		
		
		},function()
		{
		 dialog.dialog("option","title",'Referral for ' + $('#formAddRef').attr('rel'));
			trak.fn.forms.savesetup();
		 $('.dialogButtons').buttonset();
		 $('#refButtons .ui-button-text').removeClass('ui-button-text').addClass('refButtonsPad').hover(function(){
		  refEle = $(this);
		  $('#refWho').html(' '+refEle.children("img").attr("rel"));
		 },function(){
		  $('#refWho').html('…');
		 }).click(function(){
		 
		 
		  refEle = $(this);
		  
		  if (refEle.find('img').attr('data-off') == "1") {
		  	event.preventDefault();
		  }
		  else
		  {
		  	$('#refDetails').html('to '+refEle.children("img").attr("rel"));
		  	$('#formID_note').focus();
		  };
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
 _name = $(this).attr('data-visitid');
 switch( $(this).attr('data-type') ) {

	case "xxx1":
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
 
 },function()
 		{

  $("#formEditMedic").validationEngine('init');
  $("#formEditMedic").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
  $('#dialog').css('overflow','hidden'); // gets rid of the scrollbars in #dialog
  $('#tabs').tabs();
  // Forces tabs into title bar. See also dialog.create
  $('#tabs').find('.ui-tab-dialog-close').append($('a.ui-dialog-titlebar-close'));
  $('#tabs').find('.ui-tab-dialog-close').css({'position':'absolute','right':'6px', 'top':'20px'});
  $('#tabs').find('.ui-tab-dialog-close > a').css({'float':'none','padding':'0'});
  $('#tabs.ui-widget-content').css({'border':'0px'});
  $('.ui-tabs-nav').append('<div class="ui-dialog-title" style="padding-top:4px;padding-left:13px">Medical notes for '+trak.fn.name(_name)+'</div>');
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
	case "1":
 		// Doctor
 		dialog.dialog({
  close: function(){
  	//$('#formEditCP').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  open: function(){
  	$('.ui-button').blur();
						$('.ui-dialog-buttonpane').append('<div data-visitid="" style="float:left;margin:.5em 0 .5em .6em" class="patient-sbar">Info</div>');		
						$('.patient-sbar').button({icons:{primary:"ui-icon-comment"}});
 	
  	
  },
  beforeClose: function(){
  	return trak.fn.forms.savewarn();
  },
  create:	function(){
  		$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Summary</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Quality</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
		trak.fn.forms.status();




  },
  width:672,
  height:500,
  modal: true,
  buttons: trak.buttons.refer.doctor
 }).load(trak.url,{
 
 	act:	'formEditDoc',
 	id:		$(this).attr('data-refid'),
 	vid:	$(this).attr('data-visitid'),
 	type:	$(this).attr('data-type')
 
 },function() 
 		{

	trak.fn.decode('textarea[name=hodetails]');
    $('.patient-status').button('option','label',$('#_patient-status-code').attr('data-text')).button('refresh');
	$('#_patient-eotbt').button({icons:{primary:"ui-icon-lightbulb"}}).css('font-size','13px');
	$('#_patient-pathway').button({icons:{primary:"ui-icon-contact"}}).css('font-size','13px');
	dialog.dialog("option","title",'Clerking information for ' + trak.fn.name(_name));
	$('.dialogButtons').buttonset().css('font-size','13px');	
	trak.fn.forms.common();
	trak.fn.forms.pmhx();
	trak.fn.forms.activehx();
	$('.patient-sbar').attr('data-visitid', $('#formEditDoc input[name=vid]').val() );
 	trak.fn.forms.savesetup();
 if ($('#formEditDoc input[name=ho]:checked').val() == '1') {
 	$('#formEditDoc input[name=edd]').prop("disabled",false).addClass('validate[required,groupRequired[exp]]').button('refresh');
 	$('#formEditDoc textarea[name=hodetails]').prop("disabled",false);
 	$('#_hopaper').css('opacity','1');
 }
 else
 {
 	$('#formEditDoc input[name=edd]').prop("disabled",true).removeClass('validate[required,groupRequired[exp]]').button('refresh');
 	$('#formEditDoc textarea[name=hodetails]').prop("disabled",true);
  	$('#_hopaper').css('opacity','0.6');
  	trak.fn.buttonset.bordersoff('fieldset[name=_ho]'); 	
 }; 
 $('#formEditDoc input[name=ho]').click(function(){
 if ($(this).val() == '1') {
 	$('#formEditDoc input[name=edd]').prop("disabled",false).addClass('validate[required,groupRequired[exp]]').button('refresh');
 	$('#formEditDoc textarea[name=hodetails]').prop("disabled",false);
 	$('#_hopaper').css('opacity','1');
 	trak.fn.buttonset.borderson('fieldset[name=_ho]'); 
 }
 else
 {
 	$('#formEditDoc input[name=edd]').prop("disabled",true).removeClass('validate[required,groupRequired[exp]]').button('refresh');
 	$('#formEditDoc textarea[name=hodetails]').prop("disabled",true);
  	$('#_hopaper').css('opacity','0.6');
  	trak.fn.buttonset.bordersoff('fieldset[name=_ho]'); 
 };

});


 });
		break;
	case "2":
		// Staff Nurse
		dialog.dialog({
  create:	function(){
  		$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Summary</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Triage</label><input type="radio" value="3" name="db" id="db3" /><label for="db3">Nurse discharge</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();

  		//$('.ui-dialog-buttonpane').append('<div style="float:right;margin:.5em .6em .5em 0" class="patient-status">'+$('#_patient-status-code').attr('data-text')+'</div>');		
		//$('.patient-status').button({icons:{primary:"ui-icon-key"}});
		trak.fn.forms.status();



  },
  open: function(){
  	$('.ui-button').blur();
  },
  beforeClose: function(){
 	return trak.fn.forms.savewarn();
//  	if (_rxChanged == 1) {
//  		trak.confirm("The notes have been altered. Press <strong>Save</strong> to remember the changes or <strong>Cancel</strong> to discard them.",190);
//  		return false;
//  	};
  },
  close: function(){
  	$('#formEditNursing').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  width:660,
  height:500,
  modal: true,
  buttons: trak.buttons.refer.nurse
 }).load(trak.url,{
 
 	act:	'formEditNursing',
 	id:		$(this).attr('data-refid'),
 	vid:	$(this).attr('data-visitid'),
 	type:	$(this).attr('data-type')
 
 },function()
 		{
 
  dialog.dialog("option","title",'Nursing notes for ' + trak.fn.name(_name));
  //$("#formEditNursing").validationEngine('init');
  //$("#formEditNursing").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
  ///$('#dialog').css('overflow','hidden'); // gets rid of the scrollbars in #dialog
  //$('#tabs').tabs();
  // Forces tabs into title bar. See also dialog.create
  //$('#tabs').find('.ui-tab-dialog-close').append($('a.ui-dialog-titlebar-close'));
  //$('#tabs').find('.ui-tab-dialog-close').css({'position':'absolute','right':'6px', 'top':'20px'});
  //$('#tabs').find('.ui-tab-dialog-close > a').css({'float':'none','padding':'0'});
  //$('#tabs.ui-widget-content').css({'border':'0px'});
  //$('.ui-tabs-nav').append('<div class="ui-dialog-title" style="padding-top:4px;padding-left:13px">Nursing notes for '+trak.fn.name(_name)+'</div>');


trak.fn.decode('textarea[name=plan]');
trak.fn.decode('textarea[name=jobs]');

  $('.dialogButtons').buttonset().css('font-size','13px');
    $('#_patient-frailty').button({icons:{primary:"ui-icon-person"}}).css('font-size','13px');
    $('#_patient-mobility').button({icons:{primary:"ui-icon-person"}}).css('font-size','13px');
    $('#_patient-ews').button({icons:{primary:"ui-icon-alert"}}).css('font-size','13px');

 			$('.db input[name=db]').click(function(){

				if ($(this).val() == 1)
				{
					$('#_hx').fadeIn('fast');
					$('#_tri').hide();
					$('#_nldd').hide();
				};
				if ($(this).val() == 2)
				{
					$('#_hx').hide();
					$('#_nldd').hide();
					$('#_tri').fadeIn('fast');									
				};
				if ($(this).val() == 3)
				{
					$('#_hx').hide();
					$('#_tri').hide();
					$('#_nldd').fadeIn('fast');									
				};
	 		});

      // Following moved from index.php
  
		$('.patient-status').button('option','label',$('#_patient-status-code').attr('data-text')).button('refresh');

 if ($('input[name=nld]').val() == 0) {
		// Deactivate NLD
		$('#db3').prop("disabled",true).button('refresh');
		trak.fn.buttonset.bordersoff('.ui-dialog-buttonpane');
 };
 // $('input[name=ews],input[name=triage],input[name=resus]').click(function(){
//  	 _rxChanged = 1;
//  });
//  $('.SBARfield, .SBARfieldTall, .noteAuthorField').change(function(){
// 	 _rxChanged = 1;
//  });
// 
  trak.fn.forms.savesetup();
  trak.fn.forms.common();
  trak.fn.forms.pmhx();
  trak.fn.forms.activehx();
  					trak.fn.forms.scs();
					trak.fn.calcScs(false);
	
  // End move from index.php
});
 		break;
	case "5":
 		// Pharmacist
 		dialog.dialog({
  close: function(){
  	$('#formEditRx').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  open: function(){
  	$('.ui-button').blur();
  },
  beforeClose: function(){
  	return trak.fn.forms.savewarn();
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
 
 },function()
 		{
  dialog.dialog("option","title",'Prescription reconcilliation for ' + trak.fn.name(_name));
  $("#formEditRx").validationEngine('init');
  $("#formEditRx").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
  $('#dialog').css('overflow','hidden'); // gets rid of the scrollbars in #dialog
  trak.fn.forms.savesetup();
 });
		break;
	case "18":
 		// Consultant Physician
 		dialog.dialog({
  close: function(){
  	//$('#formEditCP').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  open: function(){
  	$('.ui-button').blur();

	  	
  },
  beforeClose: function(){
  	return trak.fn.forms.savewarn();
  },
  create:	function(){
		// db2 used in post-load fn
  		$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Summary</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Nurse discharge</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
		trak.fn.forms.status();
  },
  width:672,
  height:440,
  modal: true,
  buttons: trak.buttons.refer.conphys
 }).load(trak.url,{
 
 	act:	'formEditCP',
 	id:		$(this).attr('data-refid'),
 	vid:	$(this).attr('data-visitid'),
 	type:	$(this).attr('data-type')
 
 },function() 
 		{
    $('.patient-status').button('option','label',$('#_patient-status-code').attr('data-text')).button('refresh');
    $('#_patient-consultants-oc').button({icons:{primary:"ui-icon-person"}}).css('font-size','13px');
	$('#_patient-consultants-mau').button({icons:{primary:"ui-icon-person"}}).css('font-size','13px');
	$('#_suggested-ward').button({icons:{primary:"ui-icon-tag"}}).css('font-size','13px');
	dialog.dialog("option","title",'Post-take information for ' + trak.fn.name(_name));
	$('.dialogButtons').buttonset().css('font-size','13px');	

  trak.fn.forms.common();
  trak.fn.forms.pmhx();
  trak.fn.forms.activehx();

  //$("#formEditCP").validationEngine('init');
  //$("#formEditCP").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
  $("#eddd").datepicker({dateFormat: 'dd/mm/yy',altFormat: 'yy-mm-dd',minDate:0}).css('font-size','13px').css('margin-top','0px').css('height','17px').css('width','70px');
  $(".eddButton").click(function(){
		$("#eddd").val($(this).attr("data-date"));
		//$('.eddButton').attr('checked','false').button('refresh');
	});
  $('input[name=nld]').click(function(){

	var _val = $(this).val();
	if (_val==1) {
		// Activate NLD
		$('#db2').prop("disabled",false).button('refresh');
		$("label[for=db2]").effect("highlight", {color:'#FF0000'}, 'slow');
		trak.fn.buttonset.borderson('.ui-dialog-buttonpane');
	}
	else
	{
		// Deactivate NLD
		$('#db2').prop("disabled",true).button('refresh');
		trak.fn.buttonset.bordersoff('.ui-dialog-buttonpane');
	};

});
  $('#_patient-pathway').button({icons:{primary:"ui-icon-contact"}}).css('font-size','13px');
  $('.db input[name=db]').click(function(){

				if ($(this).val() == 1)
				{				
					$('#_nldd').hide();$('#_ptwr').fadeIn('fast');
					
				};
				if ($(this).val() == 2)
				{	
					$('#_ptwr').hide();		$('#_nldd').fadeIn('fast');							
				};
	 		});	
  if ($('input[name=nld]:checked').val()==1) {
		// Activate NLD
		$('#db2').prop("disabled",false).button('refresh');
		//$("label[for=db2]").effect("highlight", {color:'#FF0000'}, 'slow');
	} else {
		// Deactivate NLD
		$('#db2').prop("disabled",true).button('refresh');
		trak.fn.buttonset.bordersoff('.ui-dialog-buttonpane');
	};
//   $('#_patient-status-code, _R, #activecondAddButton, #condAddButton, input[name=resus], input[name=nld], input[name=board], .patient-status, .patient-consultants-oc, .patient-consultants-mau, .suggested-ward').click(function(){
//  	 _rxChanged = 1;
//  });
//   $('input[name=edd], input[name=alert]').change(function(){
// 	 _rxChanged = 1;
//  });
trak.fn.forms.savesetup();
 });
		break;
 	default:
 		dialog.dialog({
  title: 'Edit a referral for ' + trak.fn.name(_name),
  open: function(){
  	$('.ui-button').blur();
  },
  close: function(){
  	trak.dialogFinish();
  },
  beforeClose: function(){
  	return trak.fn.forms.savewarn();
  },
  width: 658,
  height:460,
  modal: true,
  create:	function(){
  		$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Outcome</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Referral</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		$(".db").buttonset();
		trak.fn.forms.status();

	},
  buttons: trak.buttons.refer.edit
 }).load(trak.url,{
 
 	act:	'formUpdateRef',
 	id:		$(this).attr('data-refid'),
 	vid:	$(this).attr('data-visitid'),
 	type:	$(this).attr('data-type')
 
 },function()
 		{
 
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
			$('.patient-status').button('option','label',$('#_patient-status-code').attr('data-text')).button('refresh');
			trak.fn.forms.savesetup();
 
 });
 		break;
 		
 };
 return false;

}); 
			$('.patient-discharge').live('click',function() {
 _name = $(this).attr('data-visitid');
 trak.dialogInit();
 dialog.dialog({
  close: function() {
  	$('#discPat').validationEngine('hideAll');trak.dialogFinish();
  },
  beforeClose: function(){
  	return trak.fn.forms.savewarn();
  },
  width:660,
  height:480,
  modal: true,
  open: function() {
  	$('.ui-button').blur();
  },
  buttons: trak.buttons.discharge
 }).load(trak.url,{
				 
					act:		'formDiscPat',
					vid:		$(this).attr('data-visitid')
					 
				 },
 function(){

    dialog.dialog("option","title",'Discharge ' + trak.fn.name(_name));
    $("#discPat").validationEngine('init');
	$("#discPat").validationEngine('attach', {scroll: false, validationEventTrigger: ''});
 	$(".dialogButtons").buttonset().css('font-size','13px');
	$("#eddd").datepicker({dateFormat: 'dd/mm/yy',altFormat: 'yy-mm-dd',minDate:0}).css('font-size','13px').css('margin-top','0px').css('height','17px').css('width','70px');
	$(".eddButton").click(function(){
		$("#eddd").val($(this).attr("rel"));
	});
	trak.fn.decode('textarea[name=ccom]');
	trak.fn.decode('textarea[name=gpadv]');
	trak.fn.decode('textarea[name=patadv]');
    $('#_patient-dischargedestination').button({icons:{primary:"ui-icon-suitcase"}}).css('font-size','13px');
    $('#_patient-followup').button({icons:{primary:"ui-icon-calendar"}}).css('font-size','13px');
    trak.fn.forms.savesetup();
    trak.fn.forms.dprintgp();
    trak.fn.forms.dprintpat();
 });
 return false;
});
 			$(".patient-demographics").live('click',function(){

 trak.dialogInit();
 dialog.dialog({
  title: 'Edit patient demographics',
  close: function(){
  	$('#addJob').validationEngine('hideAll');
  	trak.dialogFinish();
  },
  width:350,
  height:354,
  modal: true,
  open: function(){
  	$('.ui-button').blur();
  	
  },
  create:	function() {
						  
		//$('.ui-dialog-buttonpane').append('<div style="float:left;margin:.5em 0 .5em .8em" class="db ui-dialog-buttonset"><input checked="checked" type="radio" value="1" name="db" id="db1" /><label for="db1">Lookup</label><input type="radio" value="2" name="db" id="db2" /><label for="db2">Result</label></div><div id="notes-throbber" style="display:none;float:left;padding:14px 0 0 12px;"><img src="gfx/fbThrobber.gif" /></div>');
		//$(".db").buttonset();
  },
  buttons: trak.buttons.demo
 }).load(trak.url,
 {
 
 	act:		'formEditDemo',
 	vid:		$(this).attr('data-visitid')
  	
 },function()
 {

	$('.dialogButtons').buttonset().css('font-size','13px');
	$("input[name=dob]").datepicker({changeMonth: true,  yearRange: '-104:', dateFormat: 'dd/mm/yy', changeYear: true, minDate: '-104y', maxDate: '-0y'});
	$("input[name=nhs]").blur(function(){
		if (!isValidNhsNumber($(this).val())) {
			trak.fn.statusMessageDialog('The NHS number supplied is not valid. Please try again.');
		}
		
	}).ForceNumericOnly();
	$('input[name=pas]').ForceNumericOnly();
	trak.fn.decodeVal('#formEditDemo input[name=pname]');
	trak.fn.decode('#formEditDemo textarea[name=paddress]');
 

 
 
 });
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
         		},
         success:	function(data, status) {
         	this.set('content.text', data);
  			$("#documents .hdrWideButtons5").css({"font-size":"13px","width":"140px","text-align":"left"}).button({icons:{primary:"ui-icon-clipboard"}});
       		$('.patient-documents').qtip('reposition');
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
       		$('.patient-consultants-oc').qtip('reposition');
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
  			$(".patient-consultants-mau").live('click',function(event){
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
    					type:	"consultantsmau",
						sid:	sID    		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#consultants-mau .hdrWideButtons6").css({"font-size":"13px","width":"148px","text-align":"left"}).button({icons:{primary:"ui-icon-person"}});
       	$('.patient-consultants-mau').qtip('reposition');
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
         		width:	function(){  $("#consultants-mau .hdrWideButtons6").css('width') +8  }
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
   			$(".suggested-ward").live('click',function(event){
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
    					type:	"sugward",
						sid:	sID    		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#suggested-ward .hdrWideButtons9").css({"font-size":"13px","width":"220px","text-align":"left"}).button({icons:{primary:"ui-icon-tag"}});
       		$(".suggested-ward").qtip('reposition');
         }
    	}
  				 },
	position:	{
				xviewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				width:242,
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		xwidth:	function(){  $("#suggested-ward .hdrWideButtons9").css('width') +8  }
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
  				$("#lists-byconsultant").qtip('hide');
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
				$("#lists-other").qtip('hide');
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
			$("#lists-bydestination").live('click',function(event){
				$("#lists-other").qtip('hide');
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
    					type:	"lists-dest",
						site:	sID,
						ward:	wID,
						filter: fID     		
         		}, 
         success:	function(data, status) {
         	this.set('content.text', data);
  			$("#lists-destination div").css({"font-size":"14px","width":"200px","text-align":"left"}).button({icons:{primary:"ui-icon-tag"}});
			$("#lists-destination").qtip('reposition');
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
         		xwidth:	function(){  $("#lists-destination .hdrWideButtons24").css('width') +8  }
      			}
},event);
			});			
			
$(".patient-dischprint-gp").live('click',function() {

			trak.fn.discharge(function(){
				$('#_print-pat').click();
			});

});
$(".patient-dischprint-pat").live('click',function() {

			trak.fn.discharge(function(){
				$('#_print-gp').click();
			});

});
		
   			$(".patient-followup").live('click',function(event){
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
    					type:	"followup"
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#fu .hdrWideButtons21").css({"font-size":"13px","width":"220px","text-align":"left"}).button({icons:{primary:"ui-icon-calendar"}});
       	$('.patient-followup').qtip('reposition');
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
         		width:	function(){  $("#fu .hdrWideButtons21").css('width') +8  }
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
   			$(".patient-frailty").live('click',function(event){
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
    					type:	"frailty",
						sid:	sID    		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#frailty .hdrWideButtons10").css({"font-size":"13px","width":"160px","text-align":"left"}).button({icons:{primary:"ui-icon-link"}});
       	$('.patient-frailty').qtip('reposition');
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
         		width:	function(){  $("#frailty .hdrWideButtons10").css('width') +8  }
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
    		$(".patient-mobility").live('click',function(event){
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
    					type:	"mobility",
						sid:	sID    		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#mobility .hdrWideButtons11").css({"font-size":"13px","width":"190px","text-align":"left"}).button({icons:{primary:"ui-icon-link"}});
       	$('.patient-mobility').qtip('reposition');
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
         		width:	function(){  $("#mobility .hdrWideButtons11").css('width') +8  }
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
    		$(".patient-dischargedestination").live('click',function(event){
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
    					type:	"ddest"		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#ddest .hdrWideButtons20").css({"font-size":"13px","width":"150px","text-align":"left"}).button({icons:{primary:"ui-icon-suitcase"}});
       	$('.patient-dischargedestination').qtip('reposition');
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
         		width:	function(){  $("#ddest .hdrWideButtons20").css('width') +8  }
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
  			$(".patient-ward").live('click',function(event){
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
    					type:	"destward",
						sid:	$('input[name=destSite]:checked').val(),
						short:	$(this).attr('data-short')   		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#pat-ward .hdrWideButtons12").css({"font-size":"13px","width":"220px","text-align":"left"}).button({icons:{primary:"ui-icon-tag"}});
       		$(".patient-ward").qtip('reposition');
         }
    	}
  				 },
	position:	{
				xviewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				width:242,
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		xwidth:	function(){  $("#pat-ward .hdrWideButtons12").css('width') +8  }
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
			$('.patient-site').live('click',function(){

_site = $('input[name=destSite]:checked').val();
_ward = $('#_patient-ward-code').val();

if (trak.clickRefCode[_site] != undefined) {

$('#_patient-ward-code').val(trak.clickRefCode[_site]);
$('#_patient-ward').button('option','label',trak.clickRef[_site]);
$('#_patient-ward').button('refresh');
}
 else
 {

 _dwardCode= $('input[name=destSite]:checked').attr('data-defaultward-code');
 _dwardName= $('input[name=destSite]:checked').attr('data-defaultward');
 $('#_patient-ward-code').val(_dwardCode);
 $('#_patient-ward').button('option','label',_dwardName).button('refresh');

};

_ward = $('#_patient-ward-code').val();
_bed = trak.clickRefBed['b'+_site+'_'+_ward];

if (  _bed != undefined  )
{

	$('#_patient-bed-code').val(_bed);
_name = _bed;
if (_bed == 0)
{
	_name = 'Chair';
};
if (_bed == 127)
{
	_name = 'Virtual';
};	$('#_patient-bed').button('option','label',_name).button('refresh');

}
else
{

	$('#_patient-bed-code').val(0);
	$('#_patient-bed').button('option','label','Chair').button('refresh');

};



});
   			$(".patient-bed").live('click',function(event){
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
    					type:	"destbed",
						sid:	$('input[name=destSite]:checked').val(),
						wid:	$('input[name=patient-ward-code]').val()  		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#pat-bed .hdrWideButtons14").not('._removew').css({"font-size":"13px","width":"58px","text-align":"left","margin-bottom":"2px"}).button({icons:{primary:"ui-icon-suitcase"}});
    		$("#pat-bed ._removew").css({"font-size":"13px","text-align":"left","margin-bottom":"2px"}).button({icons:{primary:"ui-icon-suitcase"}});

       		$(".patient-bed").qtip('reposition');
       		
       		$(".hdrWideButtons14").each(function(){
 
       			if ($(this).attr('data-fade') == '1') {
       				$(this).css('opacity','0.8');
       			};      		
 
       		});
       		
         }
    	}
  				 },
	position:	{
				xviewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		xwidth:	function(){  $("#pat-bed").css('width')  },
         		xwidth: 580
      			},
    events:		{
    	show:	function(){ $('.ui-tooltip').css('max-width','1000px');
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
			$('.hdrWideButtons12').live('click',function(){

_id = $(this).attr('data-code');
_name = $(this).attr('data-name');
$('#_patient-ward-code').val(_id);
$('#_patient-ward').button('option','label',_name).button('refresh');
$(".patient-ward").qtip('hide');
trak.clickRef[$('input[name=destSite]:checked').val()]		= _name;
trak.clickRefCode[$('input[name=destSite]:checked').val()]	= _id;
_site = $('input[name=destSite]:checked').val();
_ward = $('#_patient-ward-code').val();
_bed = trak.clickRefBed['b'+_site+'_'+_ward];
if (  _bed != undefined  )
{

	$('#_patient-bed-code').val(_bed);
_name = _bed;
if (_bed == 0)
{
	_name = 'Chair';
};
if (_bed == 127)
{
	_name = 'Virtual';
};	$('#_patient-bed').button('option','label',_name).button('refresh');

}
else
{

	$('#_patient-bed-code').val(0);
	$('#_patient-bed').button('option','label','Chair').button('refresh');

};

});
			$('.hdrWideButtons14').live('click',function(){

_id = $(this).attr('data-bed');
_name = _id;
if (_id == 0)
{
	_name = 'Chair';
};
if (_id == 127)
{
	_name = 'Virtual';
};
$('#_patient-bed-code').val(_id);
$('#_patient-bed').button('option','label',_name).button('refresh');
$(".patient-bed").qtip('hide');
_site = $('input[name=destSite]:checked').val();
_ward = $('#_patient-ward-code').val();
trak.clickRefBed['b'+_site+'_'+_ward] = _id;

if ($('#_patient-bed').attr('data-vwr') == '1') {


	if ($('#_patient-bed-code').val() == '127') {

 	$('#movePat input[name=nvwr]').prop("disabled",false).addClass('validate[required,groupRequired[nvwr]]').button('refresh');
 	$('#_patient-pathway').button('enable');
	trak.fn.buttonset.borderson('fieldset[name=_ambu]');	
	}
	else
	{
	
 	$('#movePat input[name=nvwr]').prop("disabled",true).removeClass('validate[required,groupRequired[nvwr]]').button('refresh');
 	$('#_patient-pathway').button('disable');
	trak.fn.buttonset.bordersoff('fieldset[name=_ambu]');			
	};


};


}); 
   			$(".patient-ews").live('click',function(event){
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
    					type:	"ews" 		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
    		$("#pat-ews .hdrWideButtons15").css({"font-size":"13px","text-align":"left","margin-bottom":"4px"}).button({icons:{primary:"ui-icon-alert"}});
       		$(".patient-ews").qtip('reposition');
         }
    	}
  				 },
	position:	{
				xviewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#pat-ews").css('width')  },
         		xwidth: 580
      			},
    events:		{
    	show:	function(){ $('.ui-tooltip').css('max-width','1000px');
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
   			$(".patient-eotbt").live('click',function(event){
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
    					type:	"eotbt" 		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
    		$("#pat-eotbt .hdrWideButtons17").css({"font-size":"13px","width":"160px","text-align":"left"}).button({icons:{primary:"ui-icon-lightbulb"}});
       		$(".patient-eotbt").qtip('reposition');
         }
    	}
  				 },
	position:	{
				xviewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#pat-eotbt").css('width')  },
         		xwidth: 580
      			},
    events:		{
    	show:	function(){ $('.ui-tooltip').css('max-width','1000px');
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
   			$(".patient-pathway").live('click',function(event){
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
    					type:	"pathway" 		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
    		$("#pat-pathway .hdrWideButtons18").css({"font-size":"13px","width":"200px","text-align":"left"}).button({icons:{primary:"ui-icon-contact"}});
       		$(".patient-pathway").qtip('reposition');
         }
    	}
  				 },
	position:	{
				xviewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#pat-pathway").css('width')  },
         		xwidth: 580
      			},
    events:		{
    	show:	function(){ $('.ui-tooltip').css('max-width','1000px');
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
   			$(".patient-status").live('click',function(event){
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
    					type:	"status"    		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
  			$("#pat-stat .hdrWideButtons16").css({"font-size":"13px","width":"120px","text-align":"left"}).button({icons:{primary:"ui-icon-key"}});
       		$(".patient-status").qtip('reposition');
         }
    	}
  				 },
	position:	{
				xviewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				width:142,
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		xwidth:	function(){  $("#pat-stat .hdrWideButtons16").css('width') +8  }
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
   			$(".patient-sbar").live('click',function(event){
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
    					type:	"sbar",
    					vid:	$(this).attr('data-visitid') 		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
         	trak.fn.decode('#_AESName');
       		$(".patient-sbar").qtip('reposition');
         }
    	}
  				 },
	position:	{
				viewport: $(window),
				my: 'bottom center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#pat-sbar").css('width') +8  }
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
   			$(".patient-jobstatus").live('click',function(event){
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
    					type:	"jobstatus" 		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
    		$("#pat-jobstatus .hdrWideButtons19").css({"font-size":"13px","width":"120px","text-align":"left"}).button({icons:{primary:"ui-icon-key"}});
       		$(".patient-jobstatus").qtip('reposition');
         }
    	}
  				 },
	position:	{
				xviewport: $(window),
				my: 'left center',
        		at: 'center'
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width:	function(){  $("#pat-jobstatus").css('width')  },
         		xwidth: 580
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
   			$(".patient-job-subtype").live('click',function(event){
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
    					type:	"jobsubtype",
    					jid:	 $('#addJob input[name=type]:checked').val()		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
    		$("#pat-jobsubtype .hdrWideButtons22").css({"font-size":"13px","width":function(){return $(this).attr('data-width');},"text-align":"left"}).button({icons:{primary:"ui-icon-script"}});
       		$(".patient-job-subtype").qtip('reposition');
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
         		width:	function(){  $("#pat-jobsubtype").css('width')  },
         		xwidth: 580
      			},
    events:		{
    	show:	function(){ $('.ui-tooltip').css('max-width','1000px');
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
   			$(".patient-job-recipe").live('click',function(event){
 				// Overflow set to avoid flash of scrollbar when opening qTip
 				//$("body").css("overflow", "hidden");

//if ($('#addJob input[name=type]:checked').val() == '1')
//{

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
    					type:	"jobrecipe",
    					jid:	 $('#addJob input[name=type]:checked').val()		
         		},
        success:	function(data, status) {
         	this.set('content.text', data);
    		$("#pat-jobrecipe .hdrWideButtons25").css({"font-size":"13px","width":"140","text-align":"left"}).button({icons:{primary:"ui-icon-script"}});
       		$(".patient-job-recipe").qtip('reposition');
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
         		width:	function(){  $("#pat-jobrecipe").css('width')  },
         		xwidth: 580
      			},
    events:		{
    	show:	function(){ $('.ui-tooltip').css('max-width','1000px');
    				if (!($("body").height() > $(window).height()))
    				{
    					// Prevent a flash of scrollbar
    					$("body").css("overflow", "hidden");
    				};
    			},
    	hide:	function(){
    				$("body").css("overflow", "auto");
//    				$(this).qtip('destroy'); // unique in this qtip
    			}   
    }
},event);

//};

				//$("body").css("overflow", "auto");
			});




   			$(".hdrWideButtons23").live('click',function(event){
 				// Overflow set to avoid flash of scrollbar when opening qTip
 				//$("body").css("overflow", "hidden");
 				var _clicked = $(this);
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
      text: function(){
      
      var _res = $(this).find('input[name=ixres]').val();
      var _ix =  $(this).find('input[name=ixtxt]').val();
      return '<label for="result" class="nLabel">Result for '+_ix+'</label><br /><div class="notePaper" style="float:left;width:300px;"><div class="_smaller"><textarea class="_smallNote" name="result" type="text" id="result">'+_res+'</textarea></div></div><div id="_remove" style="display:none;">Remove</div><div id="_save" style="display:none;">Save</div>';
      
      },
  				 },
	position:	{
				xviewport: $(window),
				my: 'top center',
        		at: 'bottom left',
        		adjust: {
					x: 10
				}
  	  			},
  	style:		{
				classes: 'ui-tooltip-dark qtOverride',
        		tip:	{
         				corner: true
         				},
         		width: 320
      			},
    modal:		true,
    events:		{

visible:function(){

// $("#_remove").css({"font-size":"13px","margin-top":"4px","text-align":"left"}).button({icons:{primary:"ui-icon-script"}}).show().click(function(){
// 	_clicked.remove();
// 	$(".hdrWideButtons23").qtip('destroy');
// });
$("#_save").css({"font-size":"13px","margin-right":"-2px","margin-top":"4px","text-align":"left","float":"right"}).button({icons:{primary:"ui-icon-script"}}).show().click(function(){
	_clicked.find('input[name=ixres]').val($('textarea[name=result]').val());
	$(".hdrWideButtons23").qtip('destroy');

});
$(".hdrWideButtons23").qtip('reposition');

},

    	show:	function(){

    				$('.ui-tooltip').css('max-width','1000px');
    				if (!($("body").height() > $(window).height())) {
    					// Prevent a flash of scrollbar
    					$("body").css("overflow", "hidden");
    				};



    			},
    	hide:	function(){
    				$("body").css("overflow", "auto");
    					$(".hdrWideButtons23").qtip('destroy');
    			}   
    }
},event);
				//$("body").css("overflow", "auto");
			});
					
		} catch(error) {
	   			trak.confirm('There was a javascript initialisation error. Sorry.<p>[trak.actions] '+error.message+'.</p>',220)		
		};

	},	
	visRef:			Array(),
	jobsRefIDList:	Array(),
	clickRef:		Array(),
	clickRefCode:	Array(),
	clickRefBed:	Array(),
	refreshTime:	60,
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
	dialog:			"dialog",
	dialogdoc:		"dialog-doc"

};