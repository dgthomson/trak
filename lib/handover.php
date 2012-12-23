<?php

// http://stackoverflow.com/questions/9315531/opentbs-convert-html-tags-to-ms-word-tags

function f_html2docx($FieldName, &$CurrVal) {
  $CurrVal= str_replace('<linebreak>', '<w:br/>', $CurrVal);
};

function handover($trakSite,$trakWard,$viewType) {

global $_REQUEST;
global $baseSites;
global $baseStatus;
global $baseWards;
global $baseSource;
global $baseAuthorRole;
global $wardFilter;
global $jsFooter;

$patientsShown = array();
$trakRefreshRow = false;
$_tbs_data = array();
$_key = 'K8582886212201292249';

// Generate the SQL query
// ----------------------
//if (isset($_REQUEST['list'])) {
	switch ($_REQUEST['list']):
		case '0':
		case 'undefined': // Everything ie. full ward
		{
				//Original query 10/12/2011
				$sql = "SELECT *, 0 AS pred
				FROM mau_patient p, mau_visit v
				WHERE p.id=v.patient
				AND v.site='$trakSite'
				AND v.ward='$trakWard'
				AND v.status != '4'
				ORDER BY bed";
			break;};
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
		break;
		};
		case "200": // Predicted admission
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id     = v.patient
		AND   v.dsite  = '%s'
		AND   v.status = '0'
		ORDER BY v.triage",$_REQUEST['site']);
		break;
		};
		
		case "403": // Marked as needing handover
		{
		$sql = sprintf ("SELECT *, 0 AS pred FROM mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='%s'
		AND v.status != '4'
		AND v.handover = '1'
		AND v.handate >= '%s'
		ORDER BY v.ward,v.bed;",
		$_REQUEST['site'],date('Y-m-d 11:00:00'));
//		$_allWards = true;
//		$_skipFiltering = true;
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


		
		default: // Finds pts waiting to see x
		{
		$sql = sprintf ("SELECT *,0 AS pred FROM mau_referral r, mau_patient p, mau_visit v
		WHERE p.id=v.patient
		AND v.site='$trakSite'
		AND v.ward='$trakWard'
		AND v.status != '4'
		AND r.who = '%s'
		AND r.status < '4'
		AND r.visitid = v.id
		ORDER BY v.triage, r.rtime;",$_REQUEST['list']);
		break;
		};		
	endswitch;
//};


// TODO:
// Handover DONE
// Discharge DONE
// Doctor and CP for all wards DONE ?WORKING

// $sql = sprintf ("SELECT *,0 AS pred FROM mau_visit v, mau_patient p
// 		WHERE v.id IN (%s)
// 		AND p.id=v.patient
// 		ORDER BY v.bed;", implode(',',$_REQUEST['pid']) );


//echo $sql;
//exit;




//print_r($_REQUEST);
//print $sql;

// Run the query or abort
// ----------------------
$dbQuery = mysql_query($sql); if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};

// Main loop
// ---------
if (mysql_num_rows($dbQuery) != 0) {

	// Set up filtering if requested
	if($_REQUEST['filter'] != '0')
	{
 		$filter = explode(',', $wardFilter[$_REQUEST['site']][$_REQUEST['ward']][$_REQUEST['filter']][1] );
 		$filtering = TRUE;
	}
	else
	{
 	$filtering = FALSE;
 	$filter = array();
	};

	// Output data
	while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {

		// Suppresses filtered or duplicate visits
		if (($_visit['pred'] == '1') &&			
			((in_array($_visit['destBed'],$filter) && in_array($_visit['curBed'],$filter))
			||	!$filtering &&
				($_visit['ward'] == $_visit['dward']) &&
				($_visit['site'] == $_visit['dsite']))) continue;
		$patientsShown[] =  $_visit['id'];
		if ($filtering && !in_array($_visit['bed'],$filter)) continue;

		$data = dbGetByVisit('mau_data',$_visit['id']);

		$co = "";
		$sql = sprintf("SELECT * FROM mau_pmhx,med_pmhx
		WHERE patient = %s
		AND mau_pmhx.cond = med_pmhx.id
		ORDER BY mau_pmhx.id;",
		$_visit['patient']);
		$dbcQuery = mysql_query($sql); if (!$dbcQuery) {
    		echo 'Could not run query (pmhxDisplay): ' . mysql_error();
    		exit;
		};
		if (mysql_num_rows($dbcQuery) != 0) {
			while ($_drug = mysql_fetch_array($dbcQuery, MYSQL_ASSOC)) {
				$co .= $_drug['comorb'] . "</w:t><w:br/><w:t>";
			};
			$co= substr($co,0,-18); // always remove the last </w:t><w:br/><w:t> 
		};

		$ac = "";
		$sql = sprintf("SELECT * FROM mau_activehx,med_activehx
		WHERE patient = %s
		AND mau_activehx.cond = med_activehx.id
		ORDER BY mau_activehx.id;",
		$_visit['patient']);
		$dbcQuery = mysql_query($sql); if (!$dbcQuery) {
    		echo 'Could not run query (pmhxDisplay): ' . mysql_error();
    		exit;
		};
		if (mysql_num_rows($dbcQuery) != 0) {
			while ($_drug = mysql_fetch_array($dbcQuery, MYSQL_ASSOC)) {
				$ac .= $_drug['comorb'] . "</w:t><w:br/><w:t>";
			};
			$ac= substr($ac,0,-18); // always remove the last </w:t><w:br/><w:t> 
		};
	
		switch ($_visit['bed']):
			case 0:
				$_bed = "C";
				break;
			case 127:
				$_bed = "V";
				break;
			default:
				$_bed = $_visit['bed'];
				break;
		endswitch;	
		
		$_tbs_data[] = array(	'name'		=>	$_visit['name'],
								'pas'		=>	$_visit['pas'],
								'age'		=>	years_old($_visit['dob']),
								'dob'		=>	date("j/n/Y",strtotime($_visit['dob'])),
								'gender'	=>	$_visit['gender'] == 0 ? "F" : "M",
								'bed'		=>	$_bed,
								'pc'		=>	$data['pc'] != "" ? $data['pc'] : "No information for presenting complaint",
								'wd'		=>	$data['wd'] != "" ? $data['wd'] : "No information for working diagnosis",
								'co'		=>	$co,
								'ac'		=>	$ac
								

							);

		



	};
	}
	else
	{
		// No results
	};

	if (!empty($_tbs_data)) {

		@$_tbs_site[] = array(	'site'		=>	$baseSites[$_REQUEST['site']][1],
								'ward'		=>	$baseWards[$_REQUEST['site']][$_REQUEST['ward']][0],
								'filter'	=>	$wardFilter[$_REQUEST['site']][$_REQUEST['ward']][$_REQUEST['filter']][0],
								'list'		=>  $baseAuthorRole[$_REQUEST['list']][0]
							);

		// Initialise TBS->OpenTBS to generate .docx
		include_once('lib/tbs_class.php');
		include_once('lib/plugins/tbs_plugin_opentbs.php');
		$TBS = new clsTinyButStrong;
		$TBS->Plugin(TBS_INSTALL, OPENTBS_PLUGIN);
		$TBS->LoadTemplate('tpl/handover.xml.docx', OPENTBS_ALREADY_XML);
		$TBS->MergeBlock('trakHO', $_tbs_data);

		$TBS->LoadTemplate('#word/header1.xml');
		$TBS->MergeBlock('trakData', $_tbs_site);

		if ($_REQUEST['filter'] != '0') {
			$_out = sprintf(	'cache/handover_%s_%s_%s_%s.docx',
							$baseSites[$_REQUEST['site']][1],
							$baseWards[$_REQUEST['site']][$_REQUEST['ward']][1],
							$wardFilter[$_REQUEST['site']][$_REQUEST['ward']][$_REQUEST['filter']][0],
							date('U')
						);
		}
		else
		{
			$_out = sprintf(	'cache/handover_%s_%s_%s.docx',
							$baseSites[$_REQUEST['site']][1],
							$baseWards[$_REQUEST['site']][$_REQUEST['ward']][1],
							date('U')
						);
		};
		$_url = urlencode(  HOST   .'/' . $_out);
		$TBS->Show(OPENTBS_FILE, $_out);

switch ($viewType):

case "google":
echo <<<HTML
<iframe id="handover" src="http://docs.google.com/viewer?url=$_url&amp;embedded=true" width="770" height="550" style="border: none;"></iframe>
HTML;
break;

case "adeptol":
echo <<<HTML
<iframe id="adeptol" name="ajaxdocumentviewer" src="http://connect.ajaxdocumentviewer.com?key=$_key&document=$_url&viewerheight=600&viewerwidth=800&cache=no" border="0" height="600" width="800" scrolling="no" align="left" frameborder="0" marginwidth="1" marginheight="1"> Your browser does not support inline frames or is currently configured not to display inline frames. </iframe>
HTML;
break;

case "vuzit":
echo <<<HTML
<iframe type="text/html" width="770px" height="550px" src="http://vuzit.com/view/?url=$_url&output=embed&z=0&key=47103d76-8a40-7957-a9ed-c54df17d9ef0" frameborder="0" ></iframe>
HTML;
break;

case "embed":
echo <<<HTML
<object width="770" height="550" id="oWord" data="$_url" classid="clsid:00020906-0000-0000-C000-000000000046">
</object>
HTML;
break;

case "plugin":
echo <<<HTML
<object type="application/pdf" width="770" height="550" id="oWord" data="$_url" name="plugin" classid="clsid:00020906-0000-0000-C000-000000000046">
</object>
HTML;
break;

endswitch;


	} else {printf ('Nothing to report! [L:%s/F:%s/%s]',$_REQUEST['list'],$_REQUEST['filter'],$sql);};

	mysql_free_result($dbQuery);

};

?>