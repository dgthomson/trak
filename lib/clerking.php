<?php

// $_REQUEST['vid'];

error_reporting(E_ALL);
ini_set('display_errors', '1');

if (!isset($_REQUEST['vid'])) exit;

include_once "../lib/config.php";
include_once "../lib/fn.php";
$_key = 'K8582886212201292249';
dbConnect();

$sql = sprintf ("SELECT * FROM mau_patient pat, mau_visit vis
		WHERE vis.id='%s'
		AND pat.id = vis.patient
		LIMIT 1",mysql_real_escape_string($_REQUEST['vid']));
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
	while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {

		include_once('../lib/tbs_class.php');
		include_once('../lib/plugins/tbs_plugin_opentbs.php');
		$TBS = new clsTinyButStrong;
		$TBS->Plugin(TBS_INSTALL, OPENTBS_PLUGIN);
		
		$data = array(); $data[] = array(
		
						'Name'			=>	strtoupper($_visit['name']),
						'DOB'			=>	date("d/m/Y",strtotime($_visit['dob'])),
						'Age'			=>	years_old($_visit['dob']),
						'NHS'			=>	'000 000 0000',
						'PAS'			=>	$_visit['pas'],
						'AdmitDate'		=>	date("l d/m/Y",strtotime($_visit['admitdate'])),
						'FullAdmitDate'	=>	date("d/m/Y g:i a",strtotime($_visit['admitdate']))
						
						);
		$TBS->LoadTemplate('../tpl/mau.xml.docx');		$TBS->MergeBlock('trakImported', $data);

		// There are three headers and footers: first page, odd pages, even pages

		$TBS->LoadTemplate('#word/header1.xml'); 	$TBS->MergeBlock('trakImported', $data);
		$TBS->LoadTemplate('#word/header2.xml');	$TBS->MergeBlock('trakImported', $data);
		$TBS->LoadTemplate('#word/header3.xml');	$TBS->MergeBlock('trakImported', $data);
		$TBS->LoadTemplate('#word/footer1.xml');	$TBS->MergeBlock('trakImported', $data);
		$TBS->LoadTemplate('#word/footer2.xml');	$TBS->MergeBlock('trakImported', $data);
		$TBS->LoadTemplate('#word/footer3.xml');	$TBS->MergeBlock('trakImported', $data);
		$_out = "cache/mau_" . str_replace(' ', '', $_visit['name']) . ".docx";
		$_url = urlencode('http://pattrak.dyndns.org/trak/' . $_out);
		$TBS->Show(OPENTBS_FILE, '../' . $_out);

//echo <<<HTML
//<iframe id="adeptol" data-name="{$_visit['name']}" src="http://docs.google.com/viewer?url=$_url" width="770" height="550" style="border: none;"></iframe>
//HTML;

// https://docs.google.com/viewer?url=http://pattrak.dyndns.org/trak/cache/mau_EmmaFlynn.docx&chrome=true

echo <<<HTML
<iframe id="adeptol" data-name="{$_visit['name']}" name="ajaxdocumentviewer" src="http://connect.ajaxdocumentviewer.com?key=$_key&document=http://pattrak.dyndns.org/trak/$_out&viewerheight=650&viewerwidth=800&cache=yes" border="0" height="650" width="800" scrolling="no" align="left" frameborder="0" marginwidth="1" marginheight="1"> Your browser does not support inline frames or is currently configured not to display inline frames. </iframe>
HTML;
	
// echo <<<HTML
// <script type="text/javascript" src='http://www.scribd.com/javascripts/scribd_api.js'></script>
// <div id='embedded_doc' >
// <a href='http://www.scribd.com'>Scribd</a>
// </div>
// <script type="text/javascript">
//   var url = 'http://pattrak.dyndns.org/trak/pathways/pdf/COPD.pdf';
//   var pub_id = 'pub-84871336555965380904';
//   var scribd_doc = scribd.Document.getDocFromUrl(url, pub_id);
// 
//   var onDocReady = function(e){
//     scribd_doc.api.setPage(3);
//   }
// 
//   scribd_doc.addEventListener('docReady', onDocReady);
//   scribd_doc.addParam('jsapi_version', 2);
//   scribd_doc.addParam('height', 600);
//   scribd_doc.addParam('width', 400);
//   scribd_doc.addParam('public', true);
//   
//   scribd_doc.write('embedded_doc');
// </script>
// HTML;
	
	
	

	};
};













?>