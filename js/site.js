google.load('visualization', '1', {packages: ['gauge']});

var visRef=new Array();
//var nextDialogID = 1;
var HOST = 'trak';

function trakRefresh(refreshSite,refreshWard) {

// 	$('#trakList').load(
// 		"http://" + HOST + "/index.php",
// 		{
// 			act:	'write',
// 			site:	refreshSite,
// 			ward:	refreshWard
// 		}
// 	);


		$.ajax({
			type:    "POST",
			url:     "http://" + HOST + "/index.php",
			data:    ({
						act:	"write",
						site:	refreshSite,
						ward:	refreshWard
					 }),
			success: function(data){
						$('.trakPatient').remove();
						$('#trakButtons').after(data);
					 },
			error:	 function(jqXHR, textStatus, errorThrown) {

					 }
		}); // $.ajax





};
function serverTime() { 
    var time = null; 
    $.ajax({url: "http://" + HOST + "/index.php",
        async: false, dataType: 'text', 
        data: ({act: "ajax",type:"serverTime"}),
        success: function(text) { 
            time = new Date(text); 
        }, error: function(http, message, exc) { 
            time = new Date(); 
    }}); 
    return time; 
};
function getUrlVars(url) {
    var vars = [], hash;
    var hashes = url.slice(url.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
};

$(function() {

// May not be used		
$('.admEdit').live('click',function() {
            var url = this.href; var dialog = $("#dialog" + nextDialogID);
    		if ($("#dialog" + nextDialogID).length == 0) {
        		dialog = $('<div id="dialog'+ nextDialogID +'"></div>').appendTo('body');
    		} 
            dialog.load(
                url, 
                {},
                function (responseText, textStatus, XMLHttpRequest) {
                    dialog.dialog({
                    close: function() {
                    					dialog.dialog("destroy");
                    					nextDialogID+=1;
                    				  },
                    width:300, height:300, modal: true,
                    buttons: {
                    			Cancel: function() {
                    				dialog.dialog("destroy");
                    				nextDialogID+=1;
                    				},
                    			Admit:    function() {
                
      // formID_act formID_visitid formID_ward formID_triage formID_bed    				
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
													act:	 		"dbAddAdmission",
													formID_visitid:  $("#dialog" + nextDialogID + " #formID_visitid").val(),
													formID_ward:	 $("#dialog" + nextDialogID + " #jQformID_ward option:selected").val(),
													formID_triage:	 $("#dialog" + nextDialogID + " #jQformID_triage option:selected").val(),
													formID_bed:		 $("#dialog" + nextDialogID + " #formID_bed").val()
												 }),
										success: function(data){
															location.reload();
															//alert(data);
															dialog.dialog("destroy"); nextDialogID+=1;
															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
                
                
                
                
                
                    			}
                    		 },
                    title: 'Admit patient to bed'
                    }); // dialog.dialog
                }

            ); // dialog.load
            return false;
        });
$('.accEdit').live('click',function() {
            var url = this.href; var dialog = $("#dialog" + nextDialogID);
    		if ($("#dialog" + nextDialogID).length == 0) {
        		dialog = $('<div id="dialog'+ nextDialogID +'"></div>').appendTo('body');
    		} 
            dialog.load(
                url, 
                {},
                function (responseText, textStatus, XMLHttpRequest) {
                    dialog.dialog({
                    close: function() {
                    					dialog.dialog("destroy");
                    					nextDialogID+=1;
                    				  },
                    width:360, height:300, modal: true,
                    buttons: {
                    			Cancel: function() {
                    				dialog.dialog("destroy");
                    				nextDialogID+=1;
                    				},
                    			Accept:    function() {
                
      // visitid source regtime pc			
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
													act:	 		"dbAddAccept",
													formID_visitid:  $("#dialog" + nextDialogID + " #formID_visitid").val(),
													formID_source:	 $("#dialog" + nextDialogID + " #jQformID_source option:selected").val(),
													formID_regtime:	 $("#dialog" + nextDialogID + " #formID_regtime").val(),
													formID_pc:		 $("#dialog" + nextDialogID + " #formID_pc").val()
												 }),
										success: function(data){
															location.reload();
															//alert(data);
															dialog.dialog("destroy"); nextDialogID+=1;
															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
                
                
                
                
                
                    			}
                    		 },
                    title: 'Accept patient for admission'
                    }); // dialog.dialog
                }

            ); // dialog.load
            return false;
        });
        

// End: May not be used



$("#trakDash").button({icons:{primary:"ui-icon-gear"},text:true}).click(function(){

   		 $('#trakDashRow').load(
    		'http://'+HOST+'/index.php',
    		{
    			act:	'trakDash',
    			site:	sID
    	}).toggle();
    	return false;






});






$("#dispHAN").button({icons:{primary:"ui-icon-lightbulb"},text:true}).live('click',function(){
 var url = this.href + '&hansite=' + sID; var dialog = $("#dialogHAN");
 if ($("#dialogHAN").length == 0) {
  dialogHAN = $('<div id="dialogHAN"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialogHAN.dialog({
  close: function(){dialogClose(dialogHAN);},
  width:961,
  height:600,
  modal: true
 }).load(url,function(){
  dialogHAN.dialog("option","title",'Hospital at Night tasks for ' + $('#hanTable').attr('rel')); 
 });
 return false;
}); 





// jquery: Add (Add patient)
// 24th Sep 2011
objAddButtons = {
                    
                    			"↻":function(){
                    			// $('.ui-dialog-buttonset').prepend('<img class="dialogThrobber" src="gfx/spinner.gif" />');
                    			
                    			$("#addPat #id").val("0");
                    			$("#addPat #name").attr("disabled", false).css({opacity:1}).val("");
								$("#addPat #dob").attr("disabled", false).css({opacity:1}).val("");
								$("#addPat #pas").attr("disabled", false).css({opacity:1}).val("");
								$( "#addPat #patSex0" ).button( "option", "disabled", false ).attr('checked', false).button("refresh");
								$( "#addPat #patSex1" ).button( "option", "disabled", false ).attr('checked', false).button("refresh");
                    			
                    			},
                    

                    			Add:    function() {
                    				var valid = true;
									//valid = valid && checkLength($("#dialog" + nextDialogID + " #formID_author"),"the author's name",1,64);
									//valid = valid && checkLength($("#dialog" + nextDialogID + " #formID_note")  ,"the note ",0,512); // arbitary: mySQL text field size limited by server memory
									// act id pas name dob gender[1/0] reftype[1/0] reg source
									
									// Unused (yet) SBARs SBARb SBARa SBARr
									// destSite destWard xdestBedx nBed nBedNum
									
									if (valid) {
									
									if (  $('#addPat input[name=nBed]:checked').val() == 0 ) {
 										var destBed = 0;
 										}
 										else
 										{
 										var destBed = $("#addPat #nBedNum").val();
 										};
 
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
													act:	 "dbAddVisit",
													id:		 $("#addPat #id").val(),
													pas:	 $("#addPat #pas").val(),
													name:	 $("#addPat #name").val(),
													dob:	 $("#addPat #dob").val(),
													site:	 $("#addPat #site").val(),
													gender:  $('#addPat input[name=gender]:checked').val(),
													reftype: $('#addPat input[name=reftype]:checked').val(),
													reg: 	 $("#addPat #patReg").val(),
													source:  $('#addPat input[name=source]:checked').val(),
													destSite:$('#addPat input[name=destSite]:checked').val(),
													destWard:$('#addPat input[name=destWard]:checked').val(),
													destBed: destBed
												 }),
										success: function(data){
															//location.reload();
															
															
												//if ($('#addPat input[name=destSite]:checked').val() == sID &&
													//$('#addPat input[name=destWard]:checked').val() == wID)
													//{
													trakRefresh(sID,wID);
												//};
													
															
															
															//dialogClose doesn't work here for some reason
															$("#dialog").dialog("destroy").remove();

															//alert(data);
															//dialogClose(dialog);
															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
									}; // valid
                    			}
                    		 };
$("#addVisit").button({icons:{primary:"ui-icon-gear"},text:true}).click(function(){
 var url = this.href + "&addSite=" + sID; var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialog.dialog({
  title: 'Add new patient',
  close: function(){dialogClose(dialog);},
  width:400,
  height:540,
  modal: true,
  buttons: objAddButtons
 }).load(url,function(){
 	$("#addPat #nBedNum").attr("disabled",true).css({opacity:0.6});
	$("#tabs").tabs({selected:0});
	$(".dialogButtons").buttonset();
	$(".patDob").datepicker({changeMonth: true, changeYear: true, yearRange: '1910:2000', dateFormat: 'dd/mm/yy' });
	$(".patSearch").button({icons:{primary: "ui-icon-search"}});
	$("#addPat input[name=pas]").focus();
 });
 return false;
}); 
// End: Add

// jquery: Accept (Accept/Predict patient)
// 25th Sep 2011: updated for loading status
objEditButtons = {
                    		
                    			Alter:    function() {
                
// reftype destSite destWard nBedNum triage ews

									if (  $('#editPat input[name=nBed]:checked').val() == 0 ) {
 										var destBed = 0;
 										}
 										else
 										{
 										var destBed = $("#editPat #nBedNum").val();
 										};
 										
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
													act:	 	"dbEditPat",
													id:			$("#editPat input[name=id]").val(),
													reftype:  	$('#editPat input[name=reftype]:checked').val(),
													destSite:  	$('#editPat input[name=destSite]:checked').val(),
													destWard:  	$('#editPat input[name=destWard]:checked').val(),												
													triage:		$('#editPat input[name=triage]:checked').val(),
													ews:		$("#editPat input[name=ews]").val(),
													destBed:  	destBed,
													
												 }),
										success: function(data){
										
															// location.reload();
												// Don't refresh if destination site's not what we're looking at
												 if ($('#addPat input[name=destSite]:checked').val() == sID &&
													$('#addPat input[name=destWard]:checked').val() == wID)
													{
													trakRefresh(sID,wID);
												};
															//alert(data);
                    					//dialogClose(dialog);
                    					//dialogClose doesn't work here for some reason
										$("#dialog").dialog("destroy").remove();
															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
                
                
                
                
                
                    			}
                    		 };
$('.editPat').live('click',function() {
 var url = this.href; var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialog.dialog({
  title: 'Alter referral',
  close: function(){dialogClose(dialog);},
  width:400,
  height:540,
  modal: true,
  buttons: objEditButtons
 }).load(url);
 return false;
}); 
// End: Accept

// jquery: Move (Move patient)
// 25th Sep 2011: updated for loading status
objMoveButtons = {

                    			Move:    function() {
                
									if (  $('#movePat input[name=nBed]:checked').val() == 0 ) {
 										var destBed = 0;
 										}
 										else
 										{
 										var destBed = $("#movePat #nBedNum").val();
 										};
 										
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
													act:	 	"dbMovePat",
													movetype:	0,
													id:			$("#movePat input[name=id]").val(),
													destSite:  	$('#movePat input[name=destSite]:checked').val(),
													destWard:  	$('#movePat input[name=destWard]:checked').val(),												
													destBed:  	destBed
													
												 }),
										success: function(data){
															location.reload();
															//alert(data);
                    					dialogClose(dialog);
															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
                
                
                
                
                
                    			},
                    			
                           			Predict:    function() {
                


									if (  $('#movePat input[name=nBed]:checked').val() == 0 ) {
 										var destBed = 0;
 										}
 										else
 										{
 										var destBed = $("#movePat #nBedNum").val();
 										};
 										
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
													act:	 	"dbMovePat",
													movetype:	1,
													id:			$("#movePat input[name=id]").val(),
													destSite:  	$('#movePat input[name=destSite]:checked').val(),
													destWard:  	$('#movePat input[name=destWard]:checked').val(),												
													destBed:  	destBed
													
												 }),
										success: function(data){
															location.reload();
															//alert(data);
                    					dialogClose(dialog);
															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
                
                
                
                
                
                    			}            			
                    			
                    			
                    			
                    			
                    		 };
$('.movePat').live('click',function() {
 var url = this.href; var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialog.dialog({
  close: function(){dialogClose(dialog);},
  width:400,
  height:370,
  modal: true,
  buttons: objMoveButtons
 }).load(url,function(){
    dialog.dialog("option","title",'Move ' + $('#movePat').attr('rel')); 
 	$('.dialogButtons').buttonset();
	if ($('#movePat input[name=nBed]:checked').val() == 0) {
 		$("#movePat #nBedNum").attr("disabled", true).css({opacity:0.6});
 	}; 
 });
 return false;
});
// End: Move

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
						location.reload();
						dialogClose(dialog)
					 },
			error:	 function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					 }
		}); // $.ajax

	}, 

	Discharge: function() {

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
						location.reload();
					 	dialogClose(dialog)
					 },
			error:	 function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					 }

		}); // $.ajax

	},
				
	Predict: function() {

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
						location.reload();
						dialogClose(dialog)
					 },
			error:	 function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					 }
					 
		}); // $.ajax

	}
  };
$('.discPat').live('click',function() {
 var url = this.href; var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialog.dialog({
  close: function(){dialogClose(dialog);},
  width:390,
  height:205,
  modal: true,
  buttons: objDiscButtons
 }).load(url,function(){
    dialog.dialog("option","title",'Discharge ' + $('#discPat').attr('rel')); 
 	$(".dialogButtons").buttonset();
	$("#eddd").datepicker({dateFormat: 'dd/mm/yy',altFormat: 'yy-mm-dd',minDate:0});
	$(".eddButton").click(function(){
		$("#eddd").val($(this).attr("rel"));
	});
	$("#eddd").click(function(){
		$(".eddButton").attr("checked","").button("refresh");
	});
 });
 return false;
});
// End: Discharge

// jquery: Referral (Refer to other specialty)
// 7th Oct 2011: transitioned
objRefEditButtonsDefault = {


	Save:    function() { 

		$.ajax({
			type:    "POST",
			url:     "http://" + HOST + "/index.php",
			data:    ({
						act:	 		"dbAddRef",
						formID_id:		 $("#formAddRef input[name=formID_id]").val(),
						formID_noteid:	 $("#formAddRef input[name=formID_noteid]").val(),
						formID_visitid:  $("#formAddRef input[name=formID_visitid]").val(),
						formID_who:		 $("#formAddRef input[name=formID_who]:checked").val(),
						formID_status:	 $("#formAddRef input[name=formID_status]").val(),
						formID_rtime:	 $("#formAddRef input[name=formID_rtime]").val(),
						formID_note:	 $("#formAddRef textarea[name=formID_note]").val()
					 }),
			success: function(data, textStatus, jqXHR){



var trakRetObj = jQuery.parseJSON(data);

if (trakRetObj.id != undefined) {
 visRef[trakRetObj.vid].push(trakRetObj.id);
$("#patBoxRefID_" + trakRetObj.vid).append('<a id="refHREF_'+trakRetObj.id+'" class="refUpdate" href="http://' + HOST + '/index.php?act=formUpdateRef&id='+ trakRetObj.id +'&amp;vid='+trakRetObj.vid+'" rel="http://' + HOST + '/index.php?act=formUpdateRef&id='+ trakRetObj.id +'&amp;vid='+trakRetObj.vid+'"><img id="refImg_'+ trakRetObj.id +'" width="48" height="48" src="gfx/'+ trakRetObj.icon +'" /></a>');												
//genBubble(trakRetObj.id,trakRetObj.vid);


} else {

$("#refImg_"+ $("#formAddRef input[name=formID_id]").val()).attr("src","/gfx/" + trakRetObj.icon);
$("#refImg_"+ $("#formAddRef input[name=formID_id]").val()).SetBubblePopupInnerHtml($("#formAddRef textarea[name=formID_note]").val());
 
};

//dialogClose doesn't work here for some reason
$("#dialog").dialog("destroy").remove();





			},
			error: function(jqXHR, textStatus, errorThrown) {
				updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
			}
		}); // $.ajax

	}
 };
objRefEditButtonsHAN = {


	Save:    function() { 
//        x   x   x      x       x     x      x          x                          x
//formID act id noteid visitid status hx reqaction HANcompleteDate HANcompleteTime edd (expiry 10am)

		$.ajax({
			type:    "POST",
			url:     "http://" + HOST + "/index.php",
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

//dialogClose doesn't work here for some reason
$("#dialog").dialog("destroy").remove();





			},
			error: function(jqXHR, textStatus, errorThrown) {
				updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
			}
		}); // $.ajax

	}
 };
$('.refEdit').live('click',function() {
 var url = this.href; var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 switch(getUrlVars(url)["type"]) {
	case "127":
		dialog.dialog({
			title: 'Job for Hospital at Night',
			close: function(){
				dialogClose(dialog);
				clearInterval(clockMinutes);
				clearInterval(clockSeconds);
				clearInterval(clockHours);
			},
			width: 350,
			height:470,
			modal: true,
			buttons: objRefEditButtonsHAN
		}).load(url,function()
		{
  		 $('.dialogButtons').buttonset();
		 $('#formAddRef #formID_hx').focus();		
		});
	break;
	default:
		dialog.dialog({
			close: function(){dialogClose(dialog);},
			width: 334,
			height:430,
			modal: true,
			buttons: objRefEditButtonsDefault
		}).load(url,function()
		{
		 dialog.dialog("option","title",'Referral for ' + $('#formAddRef').attr('rel')); 
		 $('.dialogButtons').buttonset();
		 $('#refButtons .ui-button-text').removeClass('ui-button-text').addClass('refButtonsPad').hover(function(){
		  refEle = $(this);
		  $('#refWho').html(' '+refEle.children("img").attr("rel"));
		 },function(){
		  $('#refWho').html('…');
		 }).click(function(){
		  refEle = $(this);
		  $('#refDetails').html('for '+refEle.children("img").attr("rel"));
		  $('#formID_note').focus();
		 });	
		});
	break;
 };
 return false;
}); 
// End: Referral

// jquery: NoteEdit (Add or edit a note)
// 8th Oct 2011: transitioned
objNoteEditButtons = {

                    			Save:    function() {
                    				var valid = true;

									if (valid) {
									$.ajax({
										type:    "POST",
										url:     "http://" + HOST + "/index.php",
										data:    ({
													act:	 		"dbAddNote",
													formID_id:		 $("#formAddNote input[name=formID_id]").val(),
													formID_visitid:  $("#formAddNote input[name=formID_visitid]").val(),
													formID_refid:	 $("#formAddNote input[name=formID_refid]").val(),
													formID_author:	 $("#formAddNote input[name=formID_author]").val(),
													formID_role:	 $("#formAddNote input[name=formID_role]:checked").val(),
													formID_note:	 $("#formAddNote textarea[name=formID_note]").val()
												 }),
										success: function(){
										vid = $("#formAddNote input[name=formID_visitid]").val();
															// location.reload();
															$("#patBoxSubID_" + vid ).hide();
															
							// update count icon
							if ( $("#noteImg_"+vid+"b").length )
							{
if ($("#formAddNote input[name=formID_id]").val() == "") {
lBadge = $('#noteImg_'+vid+'b #Badge').html();
$('#noteImg_'+vid+'b #Badge').html(   Number(lBadge)+1   );
}
							}
							else
							{



$('#noteTD_'+vid).prepend('<div rel="'+vid+'" id="noteImg_'+vid+'b" class="noteImg"><img id="noteImg_'+vid+'" width="48" height="48" src="gfx/1317148344_clipboard.png" /></div>');
$('#noteImg_'+vid+'b').badger('1');
							
							};
							

															//dialogClose doesn't work here for some reason
													$("#dialog").dialog("destroy").remove();
															},
										error: function(jqXHR, textStatus, errorThrown) {
											updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
										}
									}); // $.ajax
									}; // valid
                    			}
                    		 };
$('.noteEdit').live('click',function() {
 var url = this.href; var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialog.dialog({
  close: function(){dialogClose(dialog);},
  width:330,
  height:480,
  modal: true,
  buttons: objNoteEditButtons
 }).load(url,function(){
  dialog.dialog("option","title",'Note for ' + $('#formAddNote').attr('rel'));
  $('#refButtons').buttonset();
  $('#refButtons .ui-button-text').removeClass('ui-button-text').addClass('refButtonsPad').hover(function(){
   refEle = $(this);
   $('#refWho').html('('+refEle.children("img").attr("rel")+')');
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
// End: NoteEdit

// jquery: RefUpdate (Update referral)
// 8th Oct 2011: transitioned
objRefUpdateButtons = {


	Finish:    function() { 

		$.ajax({
			type:    "POST",
			url:     "http://" + HOST + "/index.php",
			data:    ({
						act:	 		"dbUpdateRef",
						formID_refid:	$("#formUpdateRef input[name=formID_refid]").val(),
						formID_hxid:    $("#formUpdateRef input[name=formID_hxid]").val(),
						formID_dxid:    $("#formUpdateRef input[name=formID_dxid]").val(),
						formID_noteHx:  $("#formUpdateRef textarea[name=formID_noteHx]").val(),
						formID_noteDx:  $("#formUpdateRef textarea[name=formID_noteDx]").val(),
						status:			2,
						vid:			$("#formUpdateRef input[name=formID_vid]").val()
					 }),
			success: function(data, textStatus, jqXHR){

diaRefID = $("#formUpdateRef input[name=formID_refid]").val();
diaVisID = $("#formUpdateRef input[name=formID_vid]").val();
// if the referral has no triage or stopwatch it'll fail gracefully
//TODO: only delete triage if referral type doctor

					$("#refImg_" + diaRefID).hide();       // Hide referral icon
					//remBubble(diaRefID);				   // Kill popup
					$("#triage_" + diaVisID).hide();		   // Kill triage icon
					$("#cdn_" + diaRefID).countdown('destroy');      // Remove stopwatch (in case no intermediate)
					$("#cdnOuter_" + diaRefID).hide(); // ?empty();  // Kill stopwatch icon
					// delvR({$_REQUEST['vid']}, {$_REQUEST['refid']});// Not used ATM
					
					
				//dialogClose doesn't work here for some reason
				$("#dialog").dialog("destroy").remove();

			},
			error: function(jqXHR, textStatus, errorThrown) {
				updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
			}
		}); // $.ajax

	},
	
	Start:    function() { 

		$.ajax({
			type:    "POST",
			url:     "http://" + HOST + "/index.php",
			data:    ({
						act:	 		"dbUpdateRef",
						formID_refid:	$("#formUpdateRef input[name=formID_refid]").val(),
						formID_hxid:    $("#formUpdateRef input[name=formID_hxid]").val(),
						formID_dxid:    $("#formUpdateRef input[name=formID_dxid]").val(),
						formID_noteHx:  $("#formUpdateRef textarea[name=formID_noteHx]").val(),
						formID_noteDx:  $("#formUpdateRef textarea[name=formID_noteDx]").val(),
						status:			1,
						vid:			$("#formUpdateRef input[name=formID_vid]").val()
					 }),
			success: function(data, textStatus, jqXHR){

diaRefID = $("#formUpdateRef input[name=formID_refid]").val();
diaVisID = $("#formUpdateRef input[name=formID_vid]").val();


					$("#refImg_" + diaRefID).css({opacity:0.2});     // Dull referral icon
					$("#cdn_" + diaRefID).countdown('destroy');      // Remove stopwatch
					$("#cdnOuter_" + diaRefID).hide(); // ?empty();  // Kill stopwatch icon


//dialogClose doesn't work here for some reason
$("#dialog").dialog("destroy").remove();

			},
			error: function(jqXHR, textStatus, errorThrown) {
				updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
			}
		}); // $.ajax

	}	
	
	
	
	
 };
$('.refUpdate').live('click',function() {
 var url = this.href; var dialog = $("#dialog");
 if ($("#dialog").length == 0) {
  dialog = $('<div id="dialog"><img src="gfx/fbThrobber.gif" /></div>').appendTo('body');
 };
 dialog.dialog({
  title: 'Edit a referral',
  close: function(){dialogClose(dialog);},
  width: 330,
  height:390,
  modal: true,
  buttons: objRefUpdateButtons
 }).load(url);
 return false;
}); 
// End: RefUpdate

// jquery: DialogSupport (functions to support modal dialogs)
// 24th Sep 2011
$(".patSearch").live('click', function(){  
            
            // ajax stuff for search
            
            
							$.ajax({
								type:    "POST",
								url:     "http://" + HOST + "/index.php",
								data:    ({
											act:	"ajax",
											type:	"patsearch",
											pas:	$("#addPat #pas").val()
											
										 }),
								success: function(data){
								//alert(data);
								var trakRetObj = jQuery.parseJSON(data);	
								$("#addPat #name").val(trakRetObj.name);
								$("#addPat #dob").val(trakRetObj.dob);
								$("#addPat #id").val(trakRetObj.id);
								$("#addPat #patSex" + trakRetObj.gender).attr("checked",true);

								$("#addPat #name").attr("disabled", true).css({opacity:0.6});
								$("#addPat #dob").attr("disabled", true).css({opacity:0.6});
								$("#addPat #pas").attr("disabled", true).css({opacity:0.6});
								$( "#addPat #patSex0" ).button( "option", "disabled", true ).button("refresh");
								$( "#addPat #patSex1" ).button( "option", "disabled", true ).button("refresh");
		
								
													},
								error: function(jqXHR, textStatus, errorThrown) {
									updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
								}
							}); // $.ajax
     
     
     // end ajax search
     
            });
$(".clickSite").live('click',function(){
	var siteID = $(this).val();
//	if (siteID != 99) {
	 // ajax stuff for form update
            
							$.ajax({
								type:    "POST",
								url:     "http://" + HOST + "/index.php",
								data:    ({
											act:	"ajax",
											type:	"wardlist",
											site:	siteID
											
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
$(".clickBed").live('click',function(){

if (  $('#addPat input[name=nBed]:checked').val() == 0 ) {
 $("#addPat #nBedNum").attr("disabled", true).css({opacity:0.6});
 }
 else
 {
 $("#addPat #nBedNum").attr("disabled", false).css({opacity:1});
 };
});
$(".clickBedB").live('click',function(){

if (  $('#editPat input[name=nBed]:checked').val() == 0 ) {
 $("#editPat #nBedNum").attr("disabled", true).css({opacity:0.6});
 }
 else
 {
 $("#editPat #nBedNum").attr("disabled", false).css({opacity:1});
 };
});
$(".clickBedC").live('click',function(){

if (  $('#movePat input[name=nBed]:checked').val() == 0 ) {
 $("#movePat #nBedNum").attr("disabled", true).css({opacity:0.6});
 }
 else
 {
 $("#movePat #nBedNum").attr("disabled", false).css({opacity:1});
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




$(".pBLB").live('click', function () {
    var toggled = $(this).data('toggled');
    $(this).data('toggled', !toggled);
    if (!toggled) {
	    $(this).find("img:first").attr({src:"/gfx/document_decrypt.png"});
	    for (i in visRef[$(this).find("img").attr("rel")]) {
			$('#refHREF_' + visRef[$(this).find("img").attr("rel")][i]).addClass('refUpdate');
			$('#refHREF_' + visRef[$(this).find("img").attr("rel")][i]).attr('href',$('#refHREF_' + visRef[$(this).find("img").attr("rel")][i]).attr('rel'));
	    };
   		 $("#patBoxButID_"+$(this).find("img").attr("rel")).load(
    		'http://'+HOST+'/index.php',
    		{
    			act:	'ajax',
    			type:	'patBoxSub',
    			id:		$(this).find("img").attr("rel")
    	}).toggle();
		$.scrollTo("#patBoxID_"+$(this).find("img").attr("rel"),'100%');
    } else {
		// Close code. This is replicated in .pBLB/each below
		$(this).find("img:first").attr({src:"/gfx/document_encrypt.png"});
		for (i in visRef[$(this).find("img").attr("rel")])
		{
			$('#refHREF_' + visRef[$(this).find("img").attr("rel")][i]).removeAttr('class');
			$('#refHREF_' + visRef[$(this).find("img").attr("rel")][i]).removeAttr('href');
		};
		$("#patBoxButID_"+$(this).find("img").attr("rel")).toggle();
    };
    cid = $(this).find('img').attr('rel'); // delete if removing the .pBLB each fn
    $('.pBLB').each(function() {
		lid = $(this).find('img').attr('rel');
		tog = $(this).data('toggled');
		//console.log ('cid:' + cid + ' lid:' + lid);
		//to turn the hiding function off temporarily, add ! in front of tog on next line
	if (cid!=lid && tog) {
	    $(this).find("img:first").attr({src:"/gfx/document_encrypt.png"});
			for (i in visRef[$(this).find("img").attr("rel")])
			{
				$('#refHREF_' + visRef[$(this).find("img").attr("rel")][i]).removeAttr('class');
				$('#refHREF_' + visRef[$(this).find("img").attr("rel")][i]).removeAttr('href');
			};
		$("#patBoxButID_"+$(this).find("img").attr("rel")).hide();
		$(this).data('toggled', false);
	}
  	});
});
$('.noteImg').live('click',function(){
NIvisitID = $(this).attr('rel');

			  $.ajax({url: "http://"+HOST+"/index.php",type: "POST",data: ({vid: NIvisitID, act:"ajax", type:"notes"})})
			  .success(function(data){
			  
			  $("#patBoxSubID_"+NIvisitID).html(data);$("#patBoxSubID_"+NIvisitID).toggle();
			  $.scrollTo("#patBoxID_"+NIvisitID,'100%');
			  })

});
// End: DialogSupport

// jQuery: SWH (site/ward header)
// 24th Sep 2011
$(".hdrSelWard").qtip({
	hide:		{
        		fixed: true
      			},
	show:		'click',
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
	$( "#hdrSelWardID" ).button( "option", "label", '<img src="gfx/fbThrobber.gif" />' );
	//$( "#hdrSelWardID" ).button( "option", "label", '⚠' );
	
	
	$.ajax({
		type:    	"POST",
		url:     	"http://" + HOST + "/index.php",
		data:    	({
						act:	"ajax",
						type:	"hdrwardlist",
						site:	$("#selSite input[name=selectSite]:checked").val()
				 	}),
		success:	function(data){
						$('#hdrWardList').html(data).buttonset();
					},
		error: 		function(jqXHR, textStatus, errorThrown) {
						updateTips("Error sending data! Try again shortly. [" + textStatus + ": " + errorThrown +"]");
					}
	});
});
$('.hdrWideButtons').live('click',function(){
	wID   = $(this).attr("rel");
	wName = $(this).text();
	sID   = $("#selSite input[name=selectSite]:checked").val();
	$( "#hdrSelWardID" ).button( "option", "label", wName );
	$(".hdrSelWard").qtip('hide');
// 	$('#trakList').load(
// 		"http://" + HOST + "/index.php",
// 		{
// 			act:	'write',
// 			site:	sID,
// 			ward:	wID
// 		}
// 	);
trakRefresh(sID,wID)

});
// End: SWH

}); // $(function()


