<?php

function writeTrak($trakSite,$trakWard) {

global $_REQUEST;
global $baseSites;
global $baseStatus;
global $baseWards;
global $baseSource;
global $baseAuthorRole;
global $basePathway;
global $wardFilter;
global $jobType;
global $jsFooter;
global $jobStatus;

require_once 'lib/AES/aes.class.php';     // AES PHP implementation
require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 

global $__PW; $__AES = new AesCtr;

$patientsShown	= array();
$trakRefreshRow	= false;
$_allWards		= false; // Used in all-ward lists: chooses correct location and bed icon
$_skipFiltering = false; // Used in searches: allows virtual patients to be shown
		
// Select the correct SQL query
// ----------------------
if ($_REQUEST['list'] > 0) {
	switch ($_REQUEST['list']):
		case "300": // Used for single-visit lookups
		{
		// http://pattrak.dyndns.org/MyWeb/trak/index.php?act=write&list=300&vid=14&filter=0
		$sql = sprintf("
		(SELECT *, v.bed tBed, 0 AS pred FROM mau_patient p, mau_visit v
		 WHERE p.id=v.patient
		 AND v.id='%s')",$_REQUEST['vid']);
		$trakRefreshRow = true;
		break;
		};
		case "201": // Referred for admission
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id     = v.patient
		AND   v.dsite  = '%s'
		AND   v.status = '1'
		ORDER BY v.triage",$_REQUEST['site']);
		// $_allWards = true;
		break;
		};
		case "200": // Predicted admission
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id     = v.patient
		AND   v.dsite  = '%s'
		AND   v.status = '0'
		ORDER BY v.triage",$_REQUEST['site']);
		// $_allWards = true;
		break;
		};
		case "400": // 18: Waiting to see consultant, any ward
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_referral r, mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.status != '4'
		AND r.who = '18'
		AND r.status < 4
		AND r.visitid = v.id
		ORDER BY v.triage, r.rtime;",$_REQUEST['list']);
		$_allWards = true;
		break;
		};
		case "410": // 18: Waiting to see doctor, any ward
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_referral r, mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.status != '4'
		AND r.who = '1'
		AND r.status < 4
		AND r.visitid = v.id
		ORDER BY v.triage, r.rtime;",$_REQUEST['list']);
		$_allWards = true;
		break;
		};
		case "401": // Search
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.status != '4'
		AND v.id = '%s';",$_REQUEST['filter']);
		$_allWards = true;
		$_skipFiltering = true;
		break;
		};
		case "402": // Show by consultant
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.status != '4'
		AND v.consoc = '%s'
		ORDER BY v.ward,v.bed;",$_REQUEST['filter']);
		$_allWards = true;
		$_skipFiltering = true;
		break;
		};
		case "403": // Marked as needing handover
		{
		$sql = sprintf ("SELECT *, 0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.status != '4'
		AND v.handover = '1'
		AND v.handate >= '%s'
		ORDER BY v.ward,v.bed;",
		date('Y-m-d 11:00:00'));
		$_allWards = true;
		$_skipFiltering = true;
		break;
		};
		case "404": // Marked as discharged at PTWR or NLD complete
		{
		$sql = sprintf ("SELECT *, 0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.ward='$trakWard'
		AND v.status != '4'
		AND (v.sugward = '126'
		OR v.nldok = '1')
		ORDER BY v.ward,v.bed;");
		// $_allWards = true;
		$_skipFiltering = true;
		break;
		};
		case "405": // Show by destination
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.status != '4'
		AND v.dward = '%s'
		ORDER BY v.ward,v.bed;",$_REQUEST['filter']);
		$_allWards = true;
		$_skipFiltering = true;
		break;
		};
		case "406": // Show by suggested ward
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.status != '4'
		AND v.sugward = '%s'
		ORDER BY v.ward,v.bed;",$_REQUEST['filter']);
		$_allWards = true;
		$_skipFiltering = true;
		break;
		};
		case "407": // Finds all patients waiting for x investigation
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_events r, mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.ward='$trakWard'
		AND v.status != '4'
		AND r.type = '%s'
		AND r.vID = v.id
		ORDER BY v.triage, r.event_start;",$_REQUEST['filter']);
		$_extra = 0;
		break;
		};
		case "408": // Finds patients waiting for x investigation with status y
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_events r, mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.ward='$trakWard'
		AND v.status != '4'
		AND r.type = '%s'
		%s
		AND r.vID = v.id
		ORDER BY v.triage, r.event_start;",$_REQUEST['filter'],$_REQUEST['extra'] != 0 ? "AND r.status = '" . $_REQUEST['extra'] . "'" : '');
		$_extra = $_REQUEST['extra'];
		break;
		};
		case "409": // Finds discharged patients without a discharge letter
		{
		$sql = sprintf ("SELECT *, 0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.ward='$trakWard'
		AND v.status = '4'
		AND v.dxdone = '0'
		ORDER BY p.id;");
		$_skipFiltering = true;
		break;
		};
		case "411": // Finds boardable patients
		{
		$sql = sprintf ("SELECT *, 0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.ward='$trakWard'
		AND v.status != '4'
		AND v.board = '1'
		ORDER BY v.admitdate;");
		$_skipFiltering = true;
		break;
		};
		case "412": // Show by AMU consultant
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.status != '4'
		AND v.consmau = '%s'
		ORDER BY v.ward,v.bed;",$_REQUEST['filter']);
		$_allWards = true;
		$_skipFiltering = true;
		break;
		};
		default: // Finds pts waiting to see x
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_referral r, mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.ward='$trakWard'
		AND v.status != '4'
		AND r.who = '%s'
		AND r.status < 4
		AND r.visitid = v.id
		ORDER BY v.triage, r.rtime;",$_REQUEST['list']);
		break;
		};		
	endswitch;
} else {
	//Original query 10/12/2011

	if ($_REQUEST['filter'] == 127) {
		$_ordering = 'nvwrdate';
	}
	else
	{
		$_ordering = 'tBed';
	};

	$sql = "(
	SELECT *,
		v.bed  curBed,
		v.dbed destBed,
		v.bed tBed,
		0 AS pred
	FROM mau_patient p, mau_visit v
	WHERE p.id=v.patient
	AND v.site='$trakSite'
	AND v.ward='$trakWard'
	AND v.status != '4')
	UNION
	(
	SELECT *,
		v.bed  curBed,
		v.dbed destBed,
		v.dbed tBed,
		1 AS pred
	FROM mau_patient p, mau_visit v
	WHERE p.id=v.patient
	AND v.dsite='$trakSite'
	AND v.dward='$trakWard'
	AND v.status != '4')
	ORDER BY $_ordering";
};

// $_outSQL = $sql;

// Run the query or abort
// ----------------------
$dbQuery = mysql_query($sql); if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};

// Main loop
// ---------
if (mysql_num_rows($dbQuery) != 0 || $_REQUEST['list'] == 408) {

	// Set up filtering if requested
	if(($_REQUEST['filter'] != '0') && !$_skipFiltering) {

if ($_REQUEST['filter'] == 126)
{
	$filter=array(0);
	$filtering = TRUE;
};
if ($_REQUEST['filter'] == 127)
{
	$filter=array(127);
	$filtering = TRUE;
};
if ($_REQUEST['list'] == 407 || $_REQUEST['list'] == 408)
{
	$filter=array(0);
	$filtering = FALSE;
};
if (!isset($filter)) {
 		$filter = explode(',', $wardFilter[$_REQUEST['site']][$_REQUEST['ward']][$_REQUEST['filter']][1] );
 		$filtering = TRUE;
};


	} else {
 	$filtering = FALSE;
 	$filter = array();
	};

	// Suppress some HTML output if we're using trakRefreshRow
	if (!$trakRefreshRow) {	
		echo '<tbody class="trakPatient">';

if ($_REQUEST['list'] == 407 || $_REQUEST['list'] == 408)
{
echo '<tr style="" align="center" id="trakIx"><td class="tdStripe" colspan="5">';
echo '<div class="ix-status" style="margin-bottom:6px;">';
$jobStatus = array('X'=>$jobType[$_REQUEST['filter']][0],'0'=>'All') + $jobStatus;
foreach ($jobStatus as $k => $v) {
	printf	('<input %svalue="%s" data-type="%s" type="radio" id="ixt%s" name="action-ix-type" /><label class="_noselect" for="ixt%s">%s</label>',
				$_extra == $k ? 'checked="checked" ' : "",
				$k,$_REQUEST['filter'],$k,$k,$v);
};
echo '</div>';
echo '</td></tr>';

};



		echo '<tr style="display:none;" id="trakDashRow"><td class="tdStripeR" colspan="5"></td></tr>';
	};
	
	// Force display of detailed bed information
	if (isset($_REQUEST['aw'])) {
		if ($_REQUEST['aw'] == 'true') {
			$_allWards		= true;
		};
	};

	// Output HTML data
	while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {

		// Predicted, referred or offsite patients should dull
		if ($_visit['status'] == 1 || $_visit['status'] == 0 ) {
		 $_css = ' class="_dull"';
		} else {
		 $_css = "";
		};
		if ($trakWard != $_visit['ward'] || $trakSite != $_visit['site'] || $_visit['pred'] == 1) {
			$_css = ' class="_dull"';
			if (!$_allWards) {
				$_visit['originalBed'] = $_visit['bed'];
				$_visit['bed'] = $_visit['dbed'];
			};
		} else {
		 $_css = "";
		};

		// Suppress some entries
		// ... hide virtual patients, whilst making them available for filtered lists
		if (!$filtering && ($_visit['bed'] == 127) && !$_skipFiltering && !$trakRefreshRow) continue;
		if (
		
			($_visit['pred'] == '1') &&
			
			(	(	in_array($_visit['destBed'],$filter) && in_array($_visit['curBed'],$filter))
			
					||
						!$filtering &&
						($_visit['ward'] == $_visit['dward']) &&
						($_visit['site'] == $_visit['dsite'])
				)
			
			) continue;
		// ... hide duplicates in patient filter lists
		if (in_array($_visit['id'],$patientsShown)) continue;
		if ($filtering && !in_array($_visit['bed'],$filter)) continue; $patientsShown[] =  $_visit['id'];

		// Bed box, DNAR and lock icon
		if ($_visit['dnar'] == 1) {
			$dcss=" tdStripeR";
		} else {
			$dcss="";
		};
		printf ('<tr id="patBoxID_%s"%s>',$_visit['id'],$_css);

if ($_visit['status'] == 4) {
	printf ('<td class="_loc%s"><em>%s</em>',$dcss,'<div style="padding-top:2px;"><img src="gfx/2-Hot-Home-icon.png" width="34" height="34" /></div>');
}
else
{
		switch ($_visit['bed']):
			case 127:	// Virtual
			{
				if (!$_allWards || ($_visit['status'] <= 1)) {
					printf ('<td class="_loc%s"><em>%s</em>',$dcss,'<div style="padding-top:2px;"><img src="gfx/cloud.png" width="34" height="34" /></div>');
				} else {
					printf ('<td class="_loc _smallTag%s"><em>%s<br />%s</em>',$dcss, $baseWards[$_visit['site']][$_visit['ward']][1] ,'<img src="gfx/cloud.png" width="18" height="18" />');
				};
				break;
			};
			case 0:		// Chair
			{
				if (!$_allWards || ($_visit['status'] <= 1)) {
					printf ('<td class="_loc%s"><em>%s</em>',$dcss,'<div style="padding-top:2px;"><img src="gfx/hospitalchair.png" width="34" height="34" /></div>');
				} else {
					printf ('<td class="_loc _smallTag%s"><em>%s<br />%s</em>',$dcss, $baseWards[$_visit['site']][$_visit['ward']][1] ,'<img src="gfx/hospitalchair.png" width="18" height="18" />');
				};
				break;
			};
			default:
			{
				if (!$_allWards || ($_visit['status'] <= 1)) {
					printf ('<td class="_loc%s"><em>%s</em>',$dcss,$_visit['bed']);
				} else {
					printf('<td class="_loc _smallTag%s"><em>%s<br /><i>%s</i></em>',$dcss, $baseWards[$_visit['site']][$_visit['ward']][1]   ,$_visit['bed']);
				};
				break;
			};
		endswitch;
};
		
		printf ('<div class="patient-toggle"><img data-status="%s" rel="%s" src="gfx/document_encrypt.png" width="24" height="24" /></div></td>',$_visit['status'],$_visit['id']);

		// Name, PAS, DoB, age, gender
		if ($_visit['gender'] == "1") {
				$gcss="";
		} else {
				$gcss=" _red";
		};
		if ($_visit['accept'] == "1") {
				$gcss=" _green";		
		};
		printf ('<td class="_pn%s" id="_pn%s"><dl><dt data-visitid="%s">%s</dt>',$gcss, $_visit['id'] , $_visit['id'], $__AES->encrypt(strtoupper($_visit['name']), $__PW, 256));
		printf ('<dd>%s %s %s%s</dd></dl></td>',$_visit['pas'],date("j/n/Y",strtotime($_visit['dob'])),$_visit['gender'] == 0 ? "♀" : "♂",years_old($_visit['dob']));
		$decodeArray[]=$_visit['id'];

		// Triage and HAN
		echo '<td class="_info">';
		switch ($_visit['triage']):
			case "1":
				{
				printf ('<img src="gfx/red_light.png" width="32" height="32" id="triage_%s" />',$_visit['id']);
				break;
				};
			case "2":
				{
				printf ('<img src="gfx/yellow_light.png" width="32" height="32" id="triage_%s" />',$_visit['id']);
				break;
				};
			case "3":
				{
				printf ('<img src="gfx/green_light.png" width="32" height="32" id="triage_%s" />',$_visit['id']);
				break;
				};
			case "4":
				{
				printf ('<img src="gfx/blue_light.png" width="32" height="32" id="triage_%s" />',$_visit['id']);
				break;
				};
			case "127":
				{
				printf ('<img src="gfx/1194985624696670932tasto_10_architetto_fran_01.svg.png" width="32" height="32" id="triage_%s" />',$_visit['id']);
				break;
				};
		endswitch;
		
		if ($_visit['nld'] == 1) {
			if ($_visit['nldok'] == 1) {
				printf ('<img src="gfx/edit(2840).png" width="32" height="32" id="nldok_%s" />',$_visit['id']);			
			} else {
				printf ('<img src="gfx/edit(2841).png" width="32" height="32" id="nldok_%s" />',$_visit['id']);		
			};
		};
		
// 		$sql = sprintf ("SELECT * FROM mau_han
// 			WHERE mau_han.visitid = %s
//     		AND mau_han.expires >= '%s'",
//     		$_visit['id'],
//     		date('Y-m-d H:i:s'));
// 		$hanQuery = mysql_query($sql); if (!$hanQuery) {
// 			echo 'Could not run query: ' . mysql_error();
// 			exit;
// 		}
// 		if (mysql_num_rows($hanQuery) >= '1') {
// 			printf ('<img src="gfx/ktip_1453_128.png" width="32" height="32" id="han_%s" />',$_visit['id']);
// 		}
		echo '</td>';

		// Referrals
		unset($visRefList);
		$refQuery = mysql_query("SELECT * FROM mau_referral WHERE visitid = '{$_visit['id']}'");
		printf ('<td class="_ref" valign="top" id="patBoxRefID_%s"><div class="_refs%s" data-number="%s">',$_visit['id'], mysql_num_rows($refQuery)>8?' _refsOverflow':'' , mysql_num_rows($refQuery));
		if (!$refQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}
		while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
		
			$noteQuery = mysql_query("SELECT * FROM mau_note WHERE refid=" . $_referral['id']);
			if (!$noteQuery) {
				echo 'Could not run query: ' . mysql_error();
				exit;
			};
			$_note = mysql_fetch_array($noteQuery, MYSQL_ASSOC);
			$refImgID = "refImg_" . $_referral['id'];
			//			$refTmp = '<a id="refHREF_%s" data-form="http://'.HOST.'index.php?act=formUpdateRef&amp;id=%s&amp;vid=%s&amp;type=%s"><img border="0" id="%s" width="38" height="38" src="gfx/%s" /></a>';
			printf (
'<div id="refHREF_%s" data-type="%s" data-refid="%s" data-visitid="%s"><img border="0" id="%s" width="38" height="38" src="gfx/%s" /></div>',
$_referral['id'],
$_referral['who'],
$_referral['id'],
$_visit['id'],
$refImgID,
$baseAuthorRole[$_referral['who']][1]
);
			// 			echo sprintf(	$refTmp,
// 							$_referral['id'],
// 							$_referral['id'],
// 							$_visit['id'],
// 							$_referral['who'],
// 							$refImgID,
// 							$baseAuthorRole[$_referral['who']][1]);



// Change this line later
// Pending status now = 1
// Old code used pending = 0 (entries still exist in dev database using this figure)
// This line will be...
// if ($_referral['who'] == 1 && $_referral['status'] == 1) {

			if ($_referral['who'] == 1 && ($_referral['status'] == 1) || ($_referral['status'] == 0)) {

// Doctor, pending: outputs a clock
// 				$jsFooter .= sprintf ('$("#tCount_%s").countdown({onTick: trak.longWait, serverSync: trak.serverTime, since: new Date(%s,%s,%s,%s,%s,%s),format: "HMS", layout: "➘ {hn}<span id=\'xpoint\'>{sep}</span>{mnn}<span id=\'xpoint\'>{sep}</span>{snn}"});',$_visit['id'],
// 			 		date('Y',strtotime($_referral['rtime'])),
// 			 		date('m',strtotime($_referral['rtime']))-1,
// 			 		date('d',strtotime($_referral['rtime'])),
// 			 		date('G',strtotime($_referral['rtime'])),
// 			 		intval(date('i',strtotime($_referral['rtime']))),
// 			 		intval(date('s',strtotime($_referral['rtime'])))
// 			 		);

				$jsFooter .= sprintf ('trak.fn.tick(%s,%s,%s,%s,%s,%s,%s);',
					$_visit['id'],
			 		date('Y',strtotime($_referral['rtime'])),
			 		date('m',strtotime($_referral['rtime']))-1,
			 		date('d',strtotime($_referral['rtime'])),
			 		date('G',strtotime($_referral['rtime'])),
			 		intval(date('i',strtotime($_referral['rtime']))),
			 		intval(date('s',strtotime($_referral['rtime'])))
			 		);



			};
			switch ($_referral['status']):
			case "2":
				$jsFooter .= sprintf ('$("#refImg_%s").addClass("_R");',$_referral["id"]);
				break;

			case "4":
//				$jsFooter .= sprintf ('$("#refImg_%s").hide();',$_referral["id"]); // Write this out
//				$jsFooter .= sprintf ('$("#refImg_%s").addClass("_R").css({opacity:0.4});',$_referral["id"]); // Write this out
				$referralRewrite[] = $_referral["id"];
				break;


			endswitch;
			//$jsFooter .= "trak.visRef[{$_visit['id']}].push('{$_referral['id']}');";
			$visRefList[]=$_referral['id'];
		};
		mysql_free_result($refQuery);
		if (isset($visRefList))
		{
			$jsFooter .= sprintf("trak.visRef[%s]=[%s];",$_visit['id'],implode(',',$visRefList));
		};

		// Destination text
		if ($_visit['dsite'] != 0)
		{
			if ($_visit['dsite'] == 127)
			{
 				$dest='➟ <span id="xpoint">HOME</span>';
 			}
 			else
 			{
				if ($_visit['dsite'] == $_visit['site'])
				{
					$_destSite = "";
				}
				else
				{
					$_destSite = $baseSites[$_visit['dsite']][1];
				};
				if ($_visit['dward'] == $_visit['ward'])
				{
					$_destWard = "";
				}
				else
				{
					$_destWard = $baseWards[$_visit['dsite']][$_visit['dward']][1];
				};	
				if ($_visit['status'] == 1 || $_visit['status'] == 0)
				{
	 				$_refSource = $baseSource[$_visit['source']][0];
	 				if ( $_visit['source'] == 1)
	 				{


// 						 $jsFooter .= sprintf ('$("#tCount_%s").countdown({onTick: trak.longWait,serverSync: trak.serverTime, since: new Date(%s,%s,%s,%s,%s,%s),format: "HMS", layout: "➚ {hn}<span id=\'xpoint\'>{sep}</span>{mnn}<span id=\'xpoint\'>{sep}</span>{snn}"});',$_visit['id'],
// 							date('Y',strtotime($_visit['reg'])),
// 							date('m',strtotime($_visit['reg']))-1,
// 							date('d',strtotime($_visit['reg'])),
// 							date('G',strtotime($_visit['reg'])),
// 							intval(date('i',strtotime($_visit['reg']))),
// 							intval(date('s',strtotime($_visit['reg'])))
// 							);



				$jsFooter .= sprintf ('trak.fn.tick(%s,%s,%s,%s,%s,%s,%s);',
					$_visit['id'],
			 		date('Y',strtotime($_visit['reg'])),
			 		date('m',strtotime($_visit['reg']))-1,
			 		date('d',strtotime($_visit['reg'])),
			 		date('G',strtotime($_visit['reg'])),
			 		intval(date('i',strtotime($_visit['reg']))),
			 		intval(date('s',strtotime($_visit['reg'])))
			 		);





					};
				}
				else
				{
	  				$_refSource = "";
				};
				if ($_visit['status'] == 2)
				{
					if ($trakWard != $_visit['ward'] || $trakSite != $_visit['site'])
					{
	 					$_refSource = $baseWards[$_visit['site']][$_visit['ward']][1];
					}
	 				else
					{
						if ($_visit['pred'] == 1)
						{
							$_refSource = $_visit['originalBed'] == 0 ? "♿" : $_visit['originalBed'];
						}
						else
						{
							$_refSource = "";
						};
					};
				};
				switch ($_visit['dbed']):
					case 0:
						$_destBed = " ♿";
						break;
					case 127:
						$_destBed = " ☁";
						break;
					default:
						$_destBed = " " . $_visit['dbed'];
						break;
				endswitch;
 				$dest=	sprintf ('%s ➟ %s %s %s',$_refSource,$_destSite,$_destWard,$_destBed);
			};
		}
		else
		{
			$dest="";
		};
		if ($_visit['status'] == 1)
		{
 			$stat = sprintf (' REFERRED ');
		}
		elseif ($_visit['status'] == 0)
		{
 			$stat = sprintf (' PREDICTED ');
		}
		else
		{
			$stat = $_visit['alert'] != '' ? '&#9872; ' . strtoupper($_visit['alert']) . ' ' : '';
		};
		$ewscol=array('',"22BB22","22BB22","FFBF00","D00000","D00000");

if ($_visit['bed'] == !127) {

		switch ($_visit['ews']):
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:{
				$ews = sprintf (' <span style="color:#%s">&#%s;</span>',$ewscol[$_visit['ews']],(9311 + $_visit['ews']));
				break;};
			default:{
		  		$ews = '';
		  		break;};
		endswitch;

}
else
{

if ($_visit['nvwrdate'] == '0000-00-00') {
	$ews='';
}
else
{
	$ews = ' WR: <span class="_red">' . strtoupper(date("D j<\s\u\p>S</\s\u\p>",strtotime($_visit['nvwrdate']))) . '</span>';
};

};


		printf( '</div><span class="_stat" id="tStat_%s">%s</span><span class="_stat" id="tCount_%s"></span><span class="_stat _R" id="tDest_%s">%s%s</span></td>',$_visit['id'],$stat,$_visit['id'],$_visit['id'],$dest,$ews);

		// Notes/Jobs
// 		$noteQuery = mysql_query("SELECT id FROM mau_note WHERE visitid=" . $_visit['id']);
// 		if (!$noteQuery) {
// 			echo 'Could not run query: ' . mysql_error();
// 			exit;
// 		}
// 		if (mysql_num_rows($noteQuery) >= '1') {
// 			$refImgID = "noteImg_" . $_visit['id'];
// 			$refTmp = '<div rel="%s" id="%sb" class="noteImg"><img id="%s" width="38" height="38" src="gfx/%s" /></div>';
// 			echo sprintf($refTmp,$_visit['id'],$refImgID,$refImgID,"note_pad.png");
// 			$jsFooter .= sprintf('$("#%sb").badger("%s");',$refImgID,mysql_num_rows($noteQuery));
// 		};
// 		mysql_free_result($noteQuery);
	
	
		unset($jobsRefList);
		// unset($jobsRefFadedList);
		$sql = sprintf ("	SELECT * FROM mau_events
							WHERE mau_events.vid = %s
							AND status < 16;",
    					$_visit['id']);



		$jobsQuery = mysql_query($sql); if (!$jobsQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}
		printf ('<td valign="top" class="_note" id="noteTD_%s"><div class="_notes%s" data-number="%s">',$_visit['id'], mysql_num_rows($jobsQuery)>4?' _notesOverflow':'' , mysql_num_rows($jobsQuery)  );


	
			while ($_job = mysql_fetch_array($jobsQuery, MYSQL_ASSOC)) {

//				echo 'j';

printf ('<div data-date="%s" id="jobID_%s" data-jobid="%s"><img src="%s" width="38" height="38"></div>',$_job['event_start'],$_job['id'],$_job['id'], $jobType[$_job['type']][1]);
$jobsRefList[]=$_job['id'];
if ($_job['status'] >= 4) {
	$jobsRefFadedList[] = $_job['id'];
};



// 2012-04-06 21:30:00

// if (       strtotime($_job['event_start'])  > time()        )
// {
// 	$jobsRefOverdueList[] = $_job['id'];
// 
// }

if (     (time() > strtotime($_job['event_start']))    && ($_job['status'] < 4)    ) {
    $jobsRefOverdueList[] = $_job['id'];
}




			};
	
		if (isset($jobsRefList))
		{
			$jsFooter .= sprintf("trak.jobsRefIDList[%s]=[%s];",$_visit['id'],implode(',',$jobsRefList));
		};	
	
	
	
	
		if (  $_visit['edd'] == date('Y-m-d')  ) {
			$_edd='<span class="_red">TODAY</span>';
		} else
		{
			if ($_visit['edd'] == "0000-00-00") {
				$_edd = '';
			} else
			{
				$_edd  = substr(date("D",strtotime($_visit['edd'])),0,3);
				$_edd .= "&thinsp;";
				$_edd .= date("j<\s\u\p>S</\s\u\p>",strtotime($_visit['edd']));
				// $_edd .= strtoupper(date(" M",strtotime($_visit['edd'])));
			};
		};
		if ($_visit['bed'] == '127') {
			if ($_visit['pathway'] != '0') {
				$_edd = $basePathway[$_visit['pathway']][0];
			};
		};
		printf ("</div><div class='_stat _C'>%s</div></td></tr>",$_edd);
		
		// Suppress some HTML output if we're using trakRefreshRow
		if (!$trakRefreshRow)
		{
			printf ('<tr class="trakHiddenB" id="patBoxButID_%s"><td></td><td colspan="4"></td></tr>',$_visit['id']);
//			printf ('<tr class="trakHiddenN" id="patBoxSubID_%s"><td class="tdStripeG" colspan="1"></td><td colspan="4"></td></tr>',$_visit['id']);
		};
	}; // while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC))
}
else
{
	// No results: Coffee!
};

		if (!$trakRefreshRow)
		{
			//echo '</tbody>';
		};

// How many HAN jobs?
// ------------------
// $sql = sprintf ("SELECT * FROM mau_han, mau_visit, mau_patient
// 			WHERE mau_han.visitid = mau_visit.id
//     		AND mau_visit.patient = mau_patient.id
//     		AND mau_han.expires >= '%s'
//     		AND mau_visit.site = '%s'
//     		ORDER BY due",date('Y-m-d H:i:s'),$trakSite);
// $dbQuery = mysql_query($sql); if (!$dbQuery) {
//     echo 'Could not run query: ' . mysql_error();
//     exit;
// };
// if (mysql_num_rows($dbQuery))
// {
// 	$jsFooter .= sprintf('$("#action-han").badger("%s");',mysql_num_rows($dbQuery));
// }
// else
// {
// 	$jsFooter .= '$("#action-han .badger-outter").remove();';
// };

// $jsFooter .= '_AESdecryptNames = (' . implode(',',$_decodeNameList) . ');';
	
if (isset($decodeArray))
{
	$jsFooter.= 'var decodeNameIDList = [' . implode(',',$decodeArray) . '];';
}
else
{
	$jsFooter.= 'var decodeNameIDList = [];';
};


if (isset($referralRewrite))
{
	$jsFooter.= 'var referralRewriteIDList = [' . implode(',',$referralRewrite) . '];';
}
else
{
	$jsFooter.= 'var referralRewriteIDList = [];';
};

		if (isset($jobsRefFadedList))
		{
			$jsFooter .= sprintf("jobsRefFadedList=[%s];",implode(',',$jobsRefFadedList));
		}
		else
		{
		
			$jsFooter .= 'jobsRefFadedList = [];';
		
		};

		if (isset($jobsRefOverdueList))
		{
			$jsFooter .= sprintf("jobsRefOverdueList=[%s];",implode(',',$jobsRefOverdueList));
		}
		else
		{
		
			$jsFooter .= 'jobsRefOverdueList = [];';
		
		};




//$jsFooter.= 'var visRefRewriteIDList = [' . implode(',',$visRefRewrite) . '];';

//$jsFooter .= sprintf("trak.vw = '%s';",ward_calculatevirtual($trakSite,$trakWard));

echo <<<FOOTER
<script type="text/javascript"><!--
 $jsFooter 
--></script>
FOOTER;
echo PHP_EOL;

//echo '<!-- ';
//echo $_outSQL;
//echo ' -->';

mysql_free_result($dbQuery);
};

?>