<?php

//sleep(2);

// To do:

// validate PAS number
// problem with css #Date ul (pervades)


// DONE (for add only) : stop duplicate AJAX when save etc pressed and network's slow
// ... http://henrik.nyh.se/2008/07/jquery-double-submission
// ... https://github.com/dougle/jQuery-Ajax-Singleton/blob/master/README.markdown

// show site of reviews needed in another ward
// http://www.position-absolute.com/articles/using-the-jquery-validation-engine-with-modal-plugins/
// new: https://github.com/posabsolute/jQuery-Validation-Engine/blob/master/README.md#detach

// Will make referral of type x flash
// $('._refs div[data-type=x] img').addClass('_fl');

//error_reporting(E_ALL); ini_set('display_errors', '1');

session_cache_limiter('public');
session_start();
if (!isset($_SESSION['LAST_ACTIVITY'])) {
	$_SESSION['LAST_ACTIVITY'] = time();
};
include_once "./lib/config-db.php";
include_once "./lib/config.php";
include_once "./lib/tmpl.php";
include_once "./lib/write.php";
include_once "./lib/handover.php";
include_once "./lib/fn.php";

dbConnect();

if ($_REQUEST) {

if (!isset($_REQUEST['site'])) { $_REQUEST['site'] = DEFAULTSITE;};
if (!isset($_REQUEST['ward'])) { $_REQUEST['ward'] = DEFAULTWARD;};

$whatToDo = isset($_REQUEST['act']) ? $_REQUEST['act'] : '';

switch ($whatToDo):
case "dbAccept":{

		$map = array(

			'accept'		=> $_REQUEST['value']

		);
		dbPut(UPDATE,"mau_visit",$map,$_REQUEST['id']);
		echo json_encode(
			array(
				"id"	=> $_REQUEST['id'],
				"value"	=> $_REQUEST['value']
		));




break;
};
case "bedbash":{

	echo '<div id="_bedbash">';
		if ( !isset($wardFilter[$_REQUEST['ssite']][$_REQUEST['sward']]) ) {
	echo "Can't bedbash for this ward- sorry ;-{";
	exit;
};
	$wardFilter[$_REQUEST['ssite']][$_REQUEST['sward']][]=array('Chairs','0');
	$sql = sprintf("(
	SELECT *,
		v.bed  curBed,
		v.dbed destBed,
		v.bed tBed,
		0 AS pred
	FROM mau_patient p, mau_visit v
	WHERE p.id=v.patient
	AND v.site='%s'
	AND v.ward='%s'
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
	AND v.dsite='%s'
	AND v.dward='%s'
	AND v.status != '4')
	ORDER BY tBed",
	$_REQUEST['ssite'],
	$_REQUEST['sward'],
	$_REQUEST['ssite'],
	$_REQUEST['sward']);
	$_result = array();
	global $wardFilter;
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
    echo 'Could not run query (bedBash): ' . mysql_error();
    exit;
};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
			if (
				($_visit['pred'] == '1') &&
			
			(	
				($_visit['ward'] == $_visit['dward']) &&
				($_visit['site'] == $_visit['dsite'])
			)
			
			) continue; // Suppress duplicates from query
			$_result[] = array(
				'name'	=>	$_visit['name'],
				'site'	=>	$_visit['site'],
				'ward'	=>	$_visit['ward'],
				'bed'	=>	$_visit['bed'],
				'dsite'	=>	$_visit['dsite'],
				'dward'	=>	$_visit['dward'],
				'dbed'	=>	$_visit['dbed'],
				'edd'	=>	$_visit['edd'],
				'id'	=>	$_visit['id'],
				'status'	=>	$_visit['status'],
						
			);
		};
	};
	
	
	foreach ($wardFilter[$_REQUEST['ssite']][$_REQUEST['sward']] as $k => $v) {
	
	if($v[1]==127) continue; // Suppress virtual ward patients

	echo '<dl class="_bedBash">';	printf('<div style="padding-bottom:6px;" class="nLabel">%s</div>',$v[0]);
	foreach (explode(',',$v[1]) as $k) {

		// $k will have a bed number
		
 		$_found=0;
 		for ($loop=0;$loop<count($_result);$loop++) {

			if ($_result[$loop]['bed'] == $k) {
			
				// Found a patient in a bed
				
				$bedBash_color = 1;
				if ($_result[$loop]['dward'] > 0 ) {
				
				//printf(' going to %s %s',$_result[$loop]['dward'],$_result[$loop]['dbed']);
				$bedBash_color = 2;
				};
				if ($_result[$loop]['dsite'] == 127 ) {
				$bedBash_color = 4;
				//printf(' going home today (%s)',$_result[$loop]['edd']);
				
				};
				if ($_result[$loop]['status'] != '0' && $_result[$loop]['status'] != '1') {
				// ...and output
				echo bedBash_number($k,$bedBash_color,$_REQUEST['ssite'],$_REQUEST['sward'],$_result[$loop]['id']);
				echo bedBash_name($_result[$loop]['name'],$_result[$loop]['dsite'],$_result[$loop]['dward'],$_result[$loop]['dbed']);
				$_found = 1;
				};
				
			};


			if (($_result[$loop]['dbed'] == $k) && ($_result[$loop]['dward'] == $_REQUEST['sward'])) {

				// Found a patient allocated to a bed
				
				echo bedBash_number($k,5,$_REQUEST['ssite'],$_REQUEST['sward'],$_result[$loop]['id']);
				echo bedBash_name('Allocated for ' . $_result[$loop]['name']);
				$_found = 1;

			};			

		};

		if ($_found == 0) {

				echo bedBash_number($k,3,$_REQUEST['ssite'],$_REQUEST['sward'],'');			
				echo bedBash_name('Empty');			

		};
		

		

	};
	echo '</dl>';
};
	echo '<br clear="both"><span id="bedBashStatus"></span>';
echo <<<HTML
<script type="text/javascript">
$('dd').hover(function(){
	$("#bedBashStatus").html($(this).attr('data-name'));
},function(){
	$("#bedBashStatus").html('');	
});
</script>
HTML;

	echo '</div>';
	echo '<div id="_triggers" style="display:none;">';

// Predicted
$sql = sprintf ("SELECT * FROM `mau_visit` WHERE `site` = %s AND `dsite` = %s AND `status` = 0",$_REQUEST['site'],$_REQUEST['site']);
$sql = sprintf ("SELECT * FROM `mau_visit` WHERE `dsite` = %s AND `status` = 0",$_REQUEST['site']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
$_predicted = mysql_num_rows($dbQuery);
// Accepted
$sql = sprintf("SELECT * FROM `mau_visit` WHERE `site` = %s AND `dsite` = %s AND `status` = 1",$_REQUEST['site'],$_REQUEST['site']);
$sql = sprintf("SELECT * FROM `mau_visit` WHERE `dsite` = %s AND `status` = 1",$_REQUEST['site']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
$_accepted = mysql_num_rows($dbQuery);
// MAU Occupied
$sql = sprintf("SELECT * FROM `mau_visit` WHERE `site` = %s AND `ward` = %s AND `bed` != 0 AND `bed` != 127 AND `status` = 2",$_REQUEST['site'],$_REQUEST['ward']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
$_mauocc= mysql_num_rows($dbQuery);
// MAU Total
$sql = sprintf("SELECT * FROM `mau_visit` WHERE `site` = %s AND `ward` = %s AND `bed` != 127 AND `status` = 2",$_REQUEST['site'],$_REQUEST['ward']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
$_mautotal= mysql_num_rows($dbQuery);
echo <<<HTML
    <canvas class="_gauge" data-value="$_predicted" id="_gauge_predicted" width="200" height="200"></canvas>
    <canvas class="_gauge" data-value="$_accepted" id="_gauge_accepted" width="200" height="200"></canvas>
    <canvas class="_gauge" data-value="$_mauocc" id="_gauge_mauocc" width="200" height="200"></canvas>   
    <canvas class="_gauge" data-value="$_mautotal" id="_gauge_mautotal" width="200" height="200"></canvas>
        <script type="text/javascript">

        $("#_gauge_predicted")
          .gauge({
          	colorOfFill: [ '#000', '#aaa', '#ccc', '#fff' ],
             min: 0,
             max: 12,
             label: 'Predicted',
             bands: [{color: "#ff0000", from: 10, to: 12},{color: "#FF7E00", from: 8, to: 10}]
           });
        $("#_gauge_accepted")
          .gauge({
          colorOfFill: [ '#000', '#aaa', '#ccc', '#fff' ],
             min: 0,
             max: 12,
             label: 'Referred',
             bands: [{color: "#ff0000", from: 10, to: 12},{color: "#FF7E00", from: 8, to: 10}]
           });
        $("#_gauge_mauocc")
          .gauge({
          colorOfFill: [ '#000', '#aaa', '#ccc', '#fff' ],
          majorTicks:11,
          minorTicks:4,
             min: 0,
             max: 50,
             label: 'MAU IP',
             bands: [{color: "#ff0000", from: 45, to: 50},{color: "#FF7E00", from: 35, to: 45}]
           });
        $("#_gauge_mautotal")
          .gauge({
          colorOfFill: [ '#000', '#aaa', '#ccc', '#fff' ],
          majorTicks:11,
          minorTicks:4,
             min: 0,
             max: 50,
             label: 'MAU All',
             bands: [{color: "#ff0000", from: 45, to: 50},{color: "#FF7E00", from: 35, to: 45}]
           });
              </script>
HTML;


	echo '<div>';
break;
};
case "diary":{
echo <<<HTML

	<div id="scheduler" class="dhx_cal_container" style='width:100%; height:100%;'>
		<div class="dhx_cal_navline">
			<div class="dhx_cal_prev_button">&nbsp;</div>
			<div class="dhx_cal_next_button">&nbsp;</div>
			<div class="dhx_cal_today_button"></div>
			<div class="dhx_cal_date"></div>
			<div class="dhx_cal_tab" name="day_tab" style="right:204px;"></div>
			<div class="dhx_cal_tab" name="week_tab" style="right:140px;"></div>
			<div class="dhx_cal_tab" name="month_tab" style="right:76px;"></div>
		</div>
		<div class="dhx_cal_header">
		</div>
		<div class="dhx_cal_data">
		</div>
	</div>

HTML;
// echo <<<HTML
//<iframe src="scheduler.html" width="100%" height="100%"></iframe>
//HTML;

break;
};
case "scheduler":{
//print_r($_REQUEST);
	include ('js/scheduler/connector/scheduler_connector.php');
 	$res=dbConnect();
	mysql_select_db(DBNAME);
 	$calendar = new SchedulerConnector($res);
 	$calendar->event->attach("beforeRender","calendarFormatting");
	$calendar->render_table("mau_events","id","event_start,event_end,event_text,event_location,event_porter,event_desc,status","pID,vID,type");

break;
};
case "login":{

printf ('<form id="formLogin">');
echo '<div style="float:left;padding-left:44px;">';
echo '<img src="gfx/Stetho.png" width="192" height="192" />';
echo '</div>';

echo '<div style="float:left;padding-left:44px;padding-top:12px;">';
//echo '<span style="padding-right:8px;"><img src="gfx/document_encrypt.png" width="24" height="24" /></span>';
//echo '<label for="pw" class="nLabel">Password</label><br />';
printf ('<input name="pw" class="ui-button ui-widget ui-corner-all loginField" type="password" id="pw" value=""/>');
echo "</div>";
echo "</form>";
// echo '<div class="nLabel">&copy; 2012 The Pennine Acute Hospitals NHS Trust</div>';
break;

};
case "dologin":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW;//  = "trak";
		$__AES  = new AesCtr;
		// Bootstrap		
		if ($__AES->decrypt($_REQUEST['_pw'],$__PW, 256) == $__PW) {
$_SESSION['LAST_ACTIVITY'] = time();
$_vw = ward_calculatevirtual($_REQUEST['site'],$_REQUEST['ward']);
$_cw = ward_calculatechairs($_REQUEST['site'],$_REQUEST['ward']);
echo <<<HTML
<script type="text/javascript">
	trak.boot.ok('$_cw','$_vw');
</script>
HTML;


} else {
echo <<<HTML
<script type="text/javascript">
	trak.boot.reject();
</script>
HTML;
};
		break;
};
case "test":{
$_REQUEST['filter']=2;

$filter = explode(',', $wardFilter[$_REQUEST['site']][$_REQUEST['ward']][$_REQUEST['filter']][1] );
print_r($filter);
echo in_array(15,$filter);

exit;




break;
};
case "info":{

echo <<<HTML
<!doctype html>
<html>
<head>
 <script type="text/javascript" src="js/jquery-1.6.4.min.js"></script>
 <script type="text/javascript" src="js/jquery-ui-1.8.16.custom.min.js"></script>
</head>
<body>
HTML;
echo php_uname();
echo '<br>';
echo 'PHP v. ' . phpversion();
echo '<br>';
echo 'MySQL v. ' . mysql_get_server_info();
echo '<br>';
echo <<<JS
<script type="text/javascript"><!--
document.write('jQuery v.' + $().jquery);
document.write('<br>');
document.write('jQueryUI v.'+ $.ui.version);
</script>
</body>
</html>
JS;

break;
};
case "dbUpdateRx":{
// print_r ($_REQUEST);
// use something like
// $rx['drugname'][0] (the number will be identical for all index labels)
// echo "Test: " . $rx['drugname'][0];
if (!empty($_REQUEST['data'])) {
 dbStartTransaction();
 $rx = multi_parse_str($_REQUEST['data']);
 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_rx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (rxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 for ($loop=0; $loop < count($rx['drugname']); $loop++)
 {
  if (!empty($rx['drugid'][$loop]))
  {
   // Use existing drug entry
   $map['drug'] = $rx['drugid'][$loop];
  }
  else
  {
   // Make new drug entry
   $dbQuery = mysql_query(sprintf("SELECT * FROM `rx_drug` WHERE `name` = '%s' LIMIT 1;",urldecode($rx['drugname'][$loop])));
   if (!$dbQuery) {
    echo 'Could not run query (rxAddMake): ' . mysql_error();
	dbAbortTransaction();
    exit;
   }; 
   if (mysql_num_rows($dbQuery) != 0) {
    // Drug exists after all
    $_rx = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
    $map['drug'] = $_rx['id'];
   }
   else
   {
    // Create new drug
    $drugmap = array(
    	"name"	=> urldecode ($rx['drugname'][$loop]),
    	"cd"	=> $rx['cd'][$loop]
    );
    dbPut(INSERT,'rx_drug',$drugmap,NULL);
    $map['drug'] = mysql_insert_id();	
   };
  }; // entry loop for drug name
  if (!empty($rx['doseid'][$loop]))
  {
   // Use existing dose entry
   $map['dose'] = $rx['doseid'][$loop];
  }
  else
  {
   // Make new dose entry
   $sql = sprintf("	SELECT * FROM `rx_dose`
   					WHERE `drugid` = %s
   					AND `str` = '%s'
   					AND `dose` = %s 
   					AND `units` = %s
   					AND `time` = %s 
   					AND `freq` = %s 
   					AND `route` = %s;",
   					$map['drug'],
   					urldecode ($rx['str'][$loop]),
   					urldecode ($rx['dose'][$loop]),
   					$rx['units'][$loop],
   					$rx['time'][$loop],
   					$rx['freq'][$loop],
   					$rx['route'][$loop]
   					);
   $dbQuery = mysql_query(sprintf($sql));
   if (!$dbQuery) {
    echo 'Could not run query (rxAddMakeDose): ' . mysql_error();
    dbAbortTransaction();
    exit;
   }; 
   if (mysql_num_rows($dbQuery) != 0) {
    // Dose exists after all
    $_dx = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
    $map['dose'] = $_dx['id'];
   }
   else
   {
    // Create new dose
    $dosemap = array(
        "drugid"	=> $map['drug'],
    	"str"		=> urldecode ($rx['str'][$loop]),
    	"dose"		=> urldecode ($rx['dose'][$loop]),
    	"units"		=> $rx['units'][$loop],
    	"time"		=> $rx['time'][$loop],
    	"freq"		=> $rx['freq'][$loop],
    	"route"		=> $rx['route'][$loop]
    );
    dbPut(INSERT,'rx_dose',$dosemap,NULL);
    $map['dose'] = mysql_insert_id();	
   };
  }; // entry loop for dose
  $map['patient'] = $_REQUEST['pid'];
  $map['give']    = $rx['give'][$loop];
  $map['ac']      = $rx['ac'][$loop];
  dbPut(INSERT,'mau_rx',$map,NULL);
 };// drug loop
 dbEndTransaction(); 
}; // if empty

$notemap = array(

'patient' => $_REQUEST['pid'],
'visitid' => $_REQUEST['vid'],
'disc'    => $_REQUEST['notedisc'],
'rec'     => $_REQUEST['noterec']

);
if ($_REQUEST['nid'] == "") {
  dbPut(INSERT,'mau_data',$notemap,NULL);			
}
else
{
  dbPut(UPDATE,'mau_data',$notemap,$_REQUEST['nid']);	
};

break;
};
case "dbEditMedic":{
if (!empty($_REQUEST['data'])) {
 dbStartTransaction();

 $rx = multi_parse_str($_REQUEST['data']);

 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_pmhx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (pmhxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_activehx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (activehxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 

 
 
//  if (array_key_exists('pmhx', $rx)) {
//  for ($loop=0; $loop < count($rx['pmhx']); $loop++)
//  {
//   if (!empty($rx['pmhx'][$loop]))
//   {
//    // Use existing comorbitidy entry
//    $map['cond'] = $rx['pmhx'][$loop];
//   }
//   else
//   {
//    // Make new comorbitidy entry
//    $dbQuery = mysql_query(sprintf("SELECT * FROM `med_pmhx` WHERE `comorb` LIKE '%s' LIMIT 1;",urldecode($rx['pmhxname'][$loop])));
//    if (!$dbQuery) {
//     echo 'Could not run query (pmhxAddMake): ' . mysql_error();
// 	dbAbortTransaction();
//     exit;
//    };
// 
//    if (mysql_num_rows($dbQuery) != 0) {
//     // Comorbitidy exists after all
//     $_rx = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
//     $map['cond'] = $_rx['id'];
//    }
//    else
//    {
//     // Create new comorbitidy
//     $drugmap = array(
//     	"comorb"	=> ucfirst(urldecode($rx['pmhxname'][$loop])),
//     );
//     dbPut(INSERT,'med_pmhx',$drugmap,NULL);
//     $map['cond'] = mysql_insert_id();	
//    };
//   }; // entry loop for drug name
// 
// 
//   $map['patient'] = $_REQUEST['pid'];
//   dbPut(INSERT,'mau_pmhx',$map,NULL);
//  };// pmhx loop
//  };
//  if (array_key_exists('acthx', $rx)) {
//  for ($loop=0; $loop < count($rx['acthx']); $loop++)
//  {
//   if (!empty($rx['acthx'][$loop]))
//   {
//    // Use existing comorbitidy entry
//    $map['cond'] = $rx['acthx'][$loop];
//   }
//   else
//   {
//    // Make new comorbitidy entry
//    $dbQuery = mysql_query(sprintf("SELECT * FROM `med_activehx` WHERE `comorb` LIKE '%s' LIMIT 1;",urldecode($rx['acthxname'][$loop])));
//    if (!$dbQuery) {
//     echo 'Could not run query (activehxAddMake): ' . mysql_error();
// 	dbAbortTransaction();
//     exit;
//    };
// 
//    if (mysql_num_rows($dbQuery) != 0) {
//     // Comorbitidy exists after all
//     $_rx = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
//     $map['cond'] = $_rx['id'];
//    }
//    else
//    {
//     // Create new comorbitidy
//     $drugmap = array(
//     	"comorb"	=> ucfirst(urldecode($rx['acthxname'][$loop])),
//     );
//     dbPut(INSERT,'med_activehx',$drugmap,NULL);
//     $map['cond'] = mysql_insert_id();	
//    };
//   }; // entry loop for drug name
// 
// 
//   $map['patient'] = $_REQUEST['pid'];
//   dbPut(INSERT,'mau_activehx',$map,NULL);
//  };// pmhx loop
//  };

db_ActiveDiagnosis($rx);
db_PastMedicalHistory($rx);











 $notemap = array(

'patient' => $_REQUEST['pid'],
'visitid' => $_REQUEST['vid']

);
 if ($_REQUEST['nid'] == "") {
   dbPut(INSERT,'mau_data',$notemap,NULL);			
 }
 else
 {
   dbPut(UPDATE,'mau_data',$notemap,$_REQUEST['nid']);	
 };
 $visitmap = array(

'triage' => $_REQUEST['triage'],
'ews' => $_REQUEST['ews'],
 'alert' => $_REQUEST['alert']


);
 dbPut(UPDATE,'mau_visit',$visitmap,$_REQUEST['vid']);
 $patientmap = array(

'dnar' => $_REQUEST['resus']



);
 dbPut(UPDATE,'mau_patient',$patientmap,$_REQUEST['pid']);
 dbEndTransaction(); 
 
 
}; // if empty


break;}
case "dbEditNursing":{

//print_r($_REQUEST);

if (!empty($_REQUEST['data'])) {
 dbStartTransaction();

 $rx = multi_parse_str($_REQUEST['data']);
 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_pmhx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (pmhxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_activehx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (activehxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 db_ActiveDiagnosis($rx);
 db_PastMedicalHistory($rx);

//  if (array_key_exists('pmhx', $rx)) {
//  for ($loop=0; $loop < count($rx['pmhx']); $loop++)
//  {
//   if (!empty($rx['pmhx'][$loop]))
//   {
//    // Use existing comorbitidy entry
//    $map['cond'] = $rx['pmhx'][$loop];
//   }
//   else
//   {
//    // Make new comorbitidy entry
//    $dbQuery = mysql_query(sprintf("SELECT * FROM `med_pmhx` WHERE `comorb` LIKE '%s' LIMIT 1;",urldecode($rx['pmhxname'][$loop])));
//    if (!$dbQuery) {
//     echo 'Could not run query (pmhxAddMake): ' . mysql_error();
// 	dbAbortTransaction();
//     exit;
//    };
// 
//    if (mysql_num_rows($dbQuery) != 0) {
//     // Comorbitidy exists after all
//     $_rx = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
//     $map['cond'] = $_rx['id'];
//    }
//    else
//    {
//     // Create new comorbitidy
//     $drugmap = array(
//     	"comorb"	=> ucfirst(urldecode($rx['pmhxname'][$loop])),
//     );
//     dbPut(INSERT,'med_pmhx',$drugmap,NULL);
//     $map['cond'] = mysql_insert_id();	
//    };
//   }; // entry loop for drug name
// 
// 
//   $map['patient'] = $_REQUEST['pid'];
//   dbPut(INSERT,'mau_pmhx',$map,NULL);
//  };// pmhx loop
//  };
// 'pc'    => $_REQUEST['pc'],
// 'wd'     => $_REQUEST['wd'],



 
 $notemap = array(

'patient' => $_REQUEST['pid'],
'visitid' => $_REQUEST['vid'],

'plan'     => $_REQUEST['plan'],
'jobs'     => $_REQUEST['jobs'],
'scs'   => $_REQUEST['scs']
);
 if ($_REQUEST['nid'] == "") {
   dbPut(INSERT,'mau_data',$notemap,NULL);			
 } else {
   dbPut(UPDATE,'mau_data',$notemap,$_REQUEST['nid']);	
 };
 $visitmap = array(

'triage' => $_REQUEST['triage'],
'ews' => $_REQUEST['ews'],
 'alert' => $_REQUEST['alert'],
 'frailty'=> $_REQUEST['frailty'],
 'mobility'=> $_REQUEST['mobility']


);

		$vQuery = dbGet("mau_visit",$_REQUEST['vid']);
		if (($vQuery['triage'] == 127) && ($_REQUEST['triage'] == 0)) {
			$visitmap['triage'] = 127;
		};





 $patientmap = array(

'dnar' => $_REQUEST['resus']



);
 dbPut(UPDATE,'mau_patient',$patientmap,$_REQUEST['pid']);
 $refmap = array(
 
 'status' => $_REQUEST['status']
 
 );
 dbPut(UPDATE,'mau_referral',$refmap,$_REQUEST['rid']);

//print_r($refmap);


 
 $nldc = multi_parse_str($_REQUEST['nldc']);
 $_forNLD = 1; for ($_loop=1;$_loop <= 6; $_loop++) {
 	
  	$nldmap['nldcrit' . $_loop]		=	isset($nldc['nldcrit'][$_loop-1]) ? urldecode($nldc['nldcrit'][$_loop-1]) : '';
 	$nldmap['nldcrityn' . $_loop]	=	$nldc['nldcrityn'.($_loop-1)][0];
 
 	if (($nldc['nldcrit'][$_loop-1] != '') && ($nldc['nldcrityn'.($_loop-1)][0] == 0)) {
 		$_forNLD = 0;
 	};
 	
 };
 $visitmap['nldok'] = $_forNLD;
 dbPut(UPDATE,'mau_data',$nldmap,$_REQUEST['nid']);
  dbPut(UPDATE,'mau_visit',$visitmap,$_REQUEST['vid']);
  dbEndTransaction();
}; // if empty
break;};
case "dbEditCP":{

if (!empty($_REQUEST['data'])) {
 dbStartTransaction();
 
 $rx = multi_parse_str($_REQUEST['data']);
 $nldc = multi_parse_str($_REQUEST['nldc']);
 
 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_pmhx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (pmhxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_activehx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (activehxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 db_ActiveDiagnosis($rx);
 db_PastMedicalHistory($rx);

 if ($_REQUEST['eddd']!='') {
 	$_edd = explode("/",$_REQUEST['eddd']); // Array as 0-dd 1-mm 2-yyyy
 } else {
  	$_edd = explode("/",'00/00/0000'); // Array as 0-dd 1-mm 2-yyyy
 };
 if ($_REQUEST['eddd'] == date('d/m/Y')) {
	$map = array(
		'dsite'		=>	127,
		'dbed'		=>	0,
		'dward'		=>	0,
		'edd'		=>	sprintf("%s-%s-%s",$_edd[2],$_edd[1],$_edd[0]),
		'status'	=> 	2
	);
 } else {

	$map = array(
		'edd'		=>	sprintf("%s-%s-%s",$_edd[2],$_edd[1],$_edd[0]),
		'status'	=> 	2
	);
};
 $patientmap = array(
 	'dnar' 		=> $_REQUEST['resus']
 );
 $visitmap = array(
 	'alert' 	=> $_REQUEST['alert'],
 	'nld'		=> $_REQUEST['nld'],
 	'board'		=> $_REQUEST['board'],
 	'consmau'	=> $_REQUEST['cmau'],
 	'consoc'	=> $_REQUEST['coc'],
 	'sugward'	=> $_REQUEST['sugw']
 );
 $refmap = array(
 
 'status' => $_REQUEST['status']
 
 );

 $_forNLD = 1; for ($_loop=1;$_loop <= 6; $_loop++) {
 	
  	$nldmap['nldcrit' . $_loop]		=	isset($nldc['nldcrit'][$_loop-1]) ? urldecode($nldc['nldcrit'][$_loop-1]) : '';
 	$nldmap['nldcrityn' . $_loop]	=	$nldc['nldcrityn'.($_loop-1)][0];
 
 	if (($nldc['nldcrit'][$_loop-1] != '') && ($nldc['nldcrityn'.($_loop-1)][0] == 0)) {
 		$_forNLD = 0;
 	};
 	
 };
 $visitmap['nldok'] = $_forNLD;
 // Force NLDOK to off if we're not using NLD
 if($_REQUEST['nld']=='0'){
 	$visitmap['nldok'] = '0';
 };

 dbPut(UPDATE,'mau_data',		$nldmap,				$_REQUEST['nid']);
 dbPut(UPDATE,'mau_referral',	$refmap,				$_REQUEST['rid']);
 dbPut(UPDATE,'mau_visit',		$visitmap + $map,		$_REQUEST['vid']);
 //dbPut(UPDATE,'mau_visit',		$map,					$_REQUEST['vid']);
 dbPut(UPDATE,'mau_patient',	$patientmap,			$_REQUEST['pid']); 
 
 dbEndTransaction();
 
}; // if empty


break;
};
case "dbEditDoc":{
//print_r($_REQUEST);
//exit;

if (!empty($_REQUEST['data'])) {
 dbStartTransaction();
 $rx = multi_parse_str($_REQUEST['data']);

 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_pmhx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (pmhxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 $dbQuery = mysql_query(sprintf("DELETE FROM `mau_activehx` WHERE `patient` = '%s';",$_REQUEST['pid']));
 if (!$dbQuery) {
  echo 'Could not run query (activehxDelete): ' . mysql_error();
  dbAbortTransaction();
  exit;
 };
 db_ActiveDiagnosis($rx);
 db_PastMedicalHistory($rx);

// 	x board:	$("#formEditDoc input[name=board]:checked").val(),
// 	x alert:	$("#formEditDoc input[name=alert]").val(),
// 	x status:	$("#formEditDoc input[name=patient-status-code]").val(),
// 	x edd:	$('#formEditDoc input[name=edd]').val(),
// 	x eotbt:	$("#formEditDoc input[name=patient-eotbt-code]").val(),
// 	x ambu:	$("#formEditDoc input[name=patient-pathway-code]").val(),
// 	ho:		$("#formEditDoc input[name=ho]:checked").val(),
// 	hodet:	$("#formEditDoc textarea[name=hodetails]").val()



 $_edd = explode("-",$_REQUEST['edd']); // Array as 0-dd 1-mm 2-yyyy


 $visitmap = array(
	'handate'	=>	sprintf("%s-%s-%s 11:00:00",$_edd[0],$_edd[1],$_edd[2]),
 	'alert' 	=> $_REQUEST['alert'],
 	'eotbt'		=> $_REQUEST['eotbt'],
 	'pathway'	=> $_REQUEST['ambu'],
 	'board'		=> $_REQUEST['board'],
 	'handover'	=> $_REQUEST['ho']
 );
 if ($_REQUEST['status'] != 1) {
 	$visitmap['triage'] = 0;
 };
 
 $refmap = array(
 
 'status' => $_REQUEST['status']
 
 );
  $notemap = array(
 
 'handovertxt' => $_REQUEST['hodet']
 
 );
 dbPut(UPDATE,'mau_referral',$refmap,$_REQUEST['rid']);
 dbPut(UPDATE,'mau_visit',$visitmap,$_REQUEST['vid']);
 dbPut(UPDATE,'mau_data',$notemap,$_REQUEST['nid']);

//print_r($refmap);
//print_r($visitmap);
//print_r($notemap);

 //dbPut(UPDATE,'mau_patient',$patientmap,$_REQUEST['pid']);
 dbEndTransaction(); 
 
 
}; // if empty


break;
};
case "HANlist":{
$sql = sprintf ("SELECT * FROM mau_han, mau_visit, mau_patient
			WHERE mau_han.visitid = mau_visit.id
    		AND mau_visit.patient = mau_patient.id
    		AND mau_han.expires >= '%s'
    		AND mau_visit.site = '%s'
    		ORDER BY due",date('Y-m-d H:i:s'),$_REQUEST['hansite']);
		
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
printf ('<table id="hanTable" data-sitename="%s"><tbody>',$baseSites[$_REQUEST['hansite']][0]);
while ($_han = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {


echo '<tr>';

printf ('<td class="_loc _lochanward"><em>%s</em></td>',$baseWards[$_han['site']][$_han['ward']][1]);

		switch ($_han['bed']):
			case -1:
				printf ('<td class="_loc _lochanbed"><em>%s</em>','<img src="gfx/cloud.png" width="52" height="52" />');		
				break;
			case 0:
				printf ('<td class="_loc _lochanbed"><em>%s</em>','<div style="padding-top:2px;"><img src="gfx/hospitalchair.png" width="34" height="34" /></div>');
				break;
			default:
				printf ('<td class="_loc _lochanbed"><em>%s</em>',$_han['bed']);
				break;
		endswitch;

		printf ('<td class="_pn"><dl><dt>%s</dt>',strtoupper($_han['name']));
		printf ('<dd>%s %s %s%s</dd></dl></td>',$_han['pas'],date("j/n/Y",strtotime($_han['dob'])),$_han['gender'] == 0 ? "♀" : "♂",years_old($_han['dob']));

		//printf ('<td id="han_%s" class="_ref" rowspan="2" style="display:none;"><div class="">History<p>%s</p></div><div class="">Action<p>%s</p></div></td></tr>',$_han['id'],$_han['hx'],$_han['req']);
		printf ('<tr><td></td><td></td><td class="_note _stat" style="width:30px;">Hx </td><td id="hanhx_%s" class="_note _stat">%s</td></tr>',$_han['id'],$_han['hx']);
		printf ('<tr><td></td><td></td><td class="_note _stat" style="width:30px;">Job</td><td id="hanjob_%s" class="_note _stat">%s</td></tr>',$_han['id'],$_han['req']);


// printf ("<strong>%s<br />%s</strong>",$baseWards[$_han['site']][$_han['ward']][1],$_han['bed']);
//echo '</td>';

//echo '<td>';
//echo $_han['name'];
//echo '</td>';

//echo '<td>';
//echo " <strong>History</strong><br /> " . $_han['hx'] . '<br />';
//echo " <strong>Action required</strong><br /> " . $_han['req'];
//echo '</td>';
//echo '<td>';
//echo " <strong>By:</strong> " . $_han['due'] . '<br />';
//echo " <strong>Expires:</strong> " . $_han['expires'];
//echo '</td>';
//echo '</tr>';







};
echo '</tbody></table>';
} else
{
// No HAN jobs
printf ('<table id="hanTable" data-sitename="%s"><tbody><tr>',$baseSites[$_REQUEST['hansite']][0]);
//printf ('<td class="_loc _lochanward"><em>%s</em></td>','☾☺');
echo '</tr></tbody></table>';
};

break;
};
case "show":{
		template();
	break;
};
case "write":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW;$__AES  = new AesCtr;
		if ( $__AES->decrypt($_REQUEST['_pw'],$__PW, 256) != $__PW ) exit;
		if ((time() - $_SESSION['LAST_ACTIVITY'] > 1800) && ($_REQUEST['list'] != 300))
		{
   			// ...last request was more than 30m ago
   			//    but ignore list:300 though- used for single visit updates
   			header("HTTP/1.1 403 Forbidden");
   			session_destroy();   // destroy session data in storage
    		session_unset();     // unset $_SESSION variable for the runtime
 			echo "\n"; // Something!
    		//exit;
		}
		else
		{
			header("X-Trak-Javascript-MD5Hash: " . md5_file( JS_PATH . 'jquery.trak.js' ));
			writeTrak($_REQUEST['site'],$_REQUEST['ward']);
			$_SESSION['LAST_ACTIVITY'] = time();
		};

		break;
};
case "handover":{
//print_r ($_REQUEST['pid']);
//echo implode(',',$_REQUEST['pid']);

		handover($_REQUEST['site'],$_REQUEST['ward'],$_REQUEST['viewType']);
	break;
};
case "ajax":{
		switch ($_REQUEST['type']):

case "jobextras":{

// Variant of formAddJob
foreach ($jobType[$_REQUEST['job']][4] as $key => $value) {

	echo '<div style="float:left;">';
	printf ('<label for="type" class="nLabel">%s</label><br />',str_replace('_',' ',$key));
	echo	'<div class="dialogButtons">';
	foreach($value as $_loop => $option) {

		printf ('<input %s type="radio" value="%s" id="%s%s" name="%s">',
			current(array_keys($value)) == $_loop ? 'checked="checked"' : '',
			$_loop,$key,$_loop,$key
			);
		printf ('<label for="%s%s">%s</label>',
			$key,$_loop,$option
			);

	};
	echo "</div>";
	echo "</div>";

};

break;
};

			case "jobsubtype":{

if (!isset($_REQUEST['jid']))
{
	echo '<script type="text/javascript"><!--' . "\n";
	echo '  trak.fn.statusMessageDiv(".patient-job-subtype","Please choose a <em>job type</em> before adding an investigation!");' . "\n";
//	echo "  $('.patient-job-subtype').qtip('destroy');\n";
	echo '--></script>' . "\n";
	exit;
};

echo '<div id="pat-jobsubtype" >';

foreach ($jobType[$_REQUEST['jid']][2] as $k => $v) {
	printf('<div %sdata-text="%s" data-code="%s" class="hdrWideButtons22">%s</div><br>',
	isset($jobType[$_REQUEST['jid']][3]) ? 'data-width="'. $jobType[$_REQUEST['jid']][3] .'" ' : 'data-width="80" ',
	$v,$k,$v);
};

echo '</div>';




break;
};

			case "jobrecipe":{

if (!isset($_REQUEST['jid']))
{
	echo '<script type="text/javascript"><!--' . "\n";
	echo '  trak.fn.statusMessageDiv(".patient-job-recipe","Please choose a <em>job type</em> before adding an investigation recipe!");' . "\n";
	echo '--></script>' . "\n";
	exit;
};

echo '<div id="pat-jobrecipe">';

foreach ($recipe as $k => $v) {


	$_sub = explode(',',$v[1]);
	foreach ($_sub as &$k) {
		$k = "'" . $k . ':' . $jobType[1][2][$k] . "'";
	};

	$_list  = '[';
	$_list .= implode(',',$_sub);
	$_list .= ']';


	printf('<div data-list="%s" data-text="%s" class="hdrWideButtons25">%s</div><br>',
	$_list,$v[0],$v[0]);
};

echo '</div>';




break;
};


			case "sbar":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

$query = dbGet("mau_visit",$_REQUEST['vid']);
$nQuery = dbGet("mau_patient",$query['patient']);
$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);


echo '<div class="_refborder ui-widget ui-widget-content">';
echo '<span class="nLabel">Patient information</span><br>';

echo '<div class="_rrra"><span id="_AESName">';
echo $__AES->encrypt($nQuery['name'] , $__PW, 256);
echo '</span> (';
echo $nQuery['gender'] == 0 ? "♀" : "♂";
// echo '<br>';
echo years_old($nQuery['dob']);
echo ')</div>';

printf ('<span class="nLabel">Handover from %s</span><br>',$baseSource[$query['source']][0]);
echo '<table class="_noteSummary"><tbody>';
echo '<tr><td>S</td><td>';
echo nl2br($notes['SBARs']);
echo '</td></tr>';
echo '<tr><td>B</td><td>';
echo nl2br($notes['SBARb']);
echo '</td></tr>';
echo '<tr><td>A</td><td>';
echo nl2br($notes['SBARr']);
echo '</td></tr>';

// bb will include the site_id; this only exist for bedbash and not for SBARinfo
if (isset($_REQUEST['bb'])) {
if ($_REQUEST['bb'] != 'null') {

echo '</tbody></table>';
echo '<span class="nLabel">Clincal summary</span><br>';
echo '<table class="_noteSummary"><tbody>';
echo '<tr><td>Dx</td><td>';
form_ActiveDiagnosisSimple($query['patient']);
echo '</td></tr>';
echo '<tr><td>Hx</td><td>';
form_PastMedicalHistorySimple($query['patient']);
echo '</td></tr>';

};
};





echo '</tbody></table>';





echo "</div>";
break;

};
			case "documents":{

// sleep(5);

$jsFooter ='';			
echo '<div id="documents" >';
foreach ($documentTypes as $k => $v) {

// printf	('<input type="radio" id="ddoc%s" name="ddoc" />
// <label data-description="%s" data-visitid="%s" data-type="%s" id="docLabel%s" style="width:140px;text-align:left;"
// class="hdrWideButtons5" for="ddoc%s">%s</label><br/>',$k,$v[1],$_REQUEST['vid'],$k,$k,$k,$v[0] );
// $jsFooter .= sprintf('$("#ddoc%s").button({icons:{primary:"ui-icon-clipboard"}});',$k);
// $jsFooter .= sprintf('$("#docLabel%s").css("font-size","13px");',$k);

printf	('<div data-description="%s" data-visitid="%s" data-type="%s" class="hdrWideButtons5">%s</div><br/>',$v[1],$_REQUEST['vid'],$k,$v[0]);

// 140 wide


};
echo '</div>';
echo <<<FOOTER
<script type="text/javascript"><!--
 $jsFooter
--></script>
FOOTER;


			break;
			
			};
			case "consultantsmau":{
//cache_control();
echo '<div id="consultants-mau" >';
$_list = $consultantsMAU[$_REQUEST['sid']];
asort($_list, SORT_STRING);
foreach ($_list as $k => $v) {
	printf('<div data-name="%s" data-code="%s" class="hdrWideButtons6">%s</div><br>',$v,$k,$v);
};
printf('<div data-name="%s" data-code="%s" class="hdrWideButtons6" style="margin-top:4px;">%s</div><br>',"Locum",127,"Locum");
printf('<div data-name="%s" data-code="%s" class="hdrWideButtons6" style="margin-top:4px;">%s</div>',"Locum",0,"Not set");
echo '</div>';


			break;
			
			};
			case "consultantsoc":{
		
echo '<div id="consultants-oc" >';
$_list = $consultantsOncall[$_REQUEST['sid']];
asort($_list, SORT_STRING);
foreach ($_list as $k => $v) {
	printf('<div data-name="%s" data-code="%s" class="hdrWideButtons7">%s</div><br>',$v,$k,$v);
};
printf('<div data-name="%s" data-code="%s" class="hdrWideButtons7" style="margin-top:4px;">%s</div><br>',"Locum",127,"Locum");
printf('<div data-name="%s" data-code="%s" class="hdrWideButtons7" style="margin-top:4px;">%s</div>',"Locum",0,"Not set");
echo '</div>';

			break;
			
			};
			case "sugward":{
		
echo '<div id="suggested-ward" >';
	printf('<div style="margin-bottom:4px;" data-name="%s" data-code="%s" class="hdrWideButtons9">%s</div>','Any medical ward',127,'Any medical ward');

foreach ($baseWards[$_REQUEST['sid']] as $k => $v) {
	if ($v[0][0] == '(') continue; // Don't show commented-out wards
	printf('<div data-name="%s" data-code="%s" class="hdrWideButtons9">%s</div><br>',$v[0],$k,$v[0]);
};
	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons9">%s</div>','Discharge',126,'Discharge');
	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons9">%s</div>','Not set',0,'Not set');
echo '</div>';
			break;
			
			};		
			case "destward":{
		
echo '<div id="pat-ward" >';




foreach ($baseWards[$_REQUEST['sid']] as $k => $v) {
	if ($v[0][0] == '(') continue; // Don't show commented-out wards
	printf('<div data-name="%s" data-code="%s" class="hdrWideButtons12">%s</div><br>',  isset($_REQUEST['short']) ? $v[1] : $v[0],$k,$v[0]);

};
//	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons12">%s</div>','Any medical ward',127,'Any medical ward');
//	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons12">%s</div>','Not set',0,'Not set');
echo '</div>';
			break;
			
			};
			case 'destbed':{

	// Adapted from bedbash
	$sql = sprintf("(
	SELECT *,
		v.bed  curBed,
		v.dbed destBed,
		v.bed tBed,
		0 AS pred
	FROM mau_patient p, mau_visit v
	WHERE p.id=v.patient
	AND v.site='%s'
	AND v.ward='%s'
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
	AND v.dsite='%s'
	AND v.dward='%s'
	AND v.status != '4')
	ORDER BY tBed",
	$_REQUEST['sid'],
	$_REQUEST['wid'],
	$_REQUEST['sid'],
	$_REQUEST['wid']);
	$_result = array();
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
    echo 'Could not run query (ajax:destbed): ' . mysql_error();
    exit;
};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
			if (
				($_visit['pred'] == '1') &&
			
			(	
				($_visit['ward'] == $_visit['dward']) &&
				($_visit['site'] == $_visit['dsite'])
			)
			
			) continue; // Suppress duplicates from query
			$_result[  $_visit['pred'] == 1 ? $_visit['dbed'] : $_visit['bed']  ] = $_visit['pred']; 
		};
	};
	// print_r($_result);

			
$_beds = $baseWards[$_REQUEST['sid']][$_REQUEST['wid']][2];
$_mod = ceil(sqrt($_beds)) > 4 ? 5 : ceil(sqrt($_beds));
// sqrt(49)
// echo ceil(4.3);    // 5
printf( '<div id="pat-bed" style="width:%spx">',$_mod*62);
printf('<div data-bed="%s" class="hdrWideButtons14 _removew">%s</div>',0,'Chair');
printf('<div data-bed="%s" class="hdrWideButtons14 _removew">%s</div><br />',127,'Virtual');
for ($loop=1;$loop <= $_beds; $loop++) {

unset($_desc); $_fade = 0;
if (isset($_result[$loop])) {

	if ($_result[$loop] == 1) {
		$_desc = sprintf('<span style="color:orange;">%s</span>',$loop);
		$_fade = 1;
	}
	else
	{
		$_desc = sprintf('<span style="color:red;">%s</span>',$loop);
		$_fade = 1;
	};

};
if (!isset($_desc)) {
	$_desc = $loop;
};



	printf('<div %sdata-bed="%s" class="hdrWideButtons14">%s</div>',$_fade == 1 ? 'data-fade="1" ' : '',$loop,$_desc);
	if (($loop % $_mod) == 0) echo '<br />';
};
echo '</div>';			
			break;
			
			
			};
			case 'ews':{
			

printf( '<div id="pat-ews">');
for ($loop=0;$loop <= 6; $loop++) {
	printf('<div data-ews="%s" class="hdrWideButtons15">%s</div>',$loop,$loop);
};
echo '</div>';			
			break;
			
			
			};			
			case "eotbt":{
		
echo '<div id="pat-eotbt" >';

foreach ($baseEOTBT as $k => $v) {
	printf('<div data-text="%s" data-code="%s" class="hdrWideButtons17">%s</div><br>',$v,$k,$v);
};
	printf('<div style="margin-top:4px;" data-text="%s" data-code="%s" class="hdrWideButtons17">%s</div>','Not set',0,'Not set');
echo '</div>';

			break;
			
			};
			case "jobstatus":{
		
echo '<div id="pat-jobstatus" >';

foreach ($jobStatus as $k => $v) {
	printf('<div data-text="%s" data-code="%s" class="hdrWideButtons19">%s</div><br>',$v,$k,$v);
};
echo '</div>';

			break;
			
			};
			case "pathway":{
		
echo '<div id="pat-pathway" >';

foreach ($basePathway as $k => $v) {
	printf('<div data-url="%s" data-text="%s" data-code="%s" class="hdrWideButtons18">%s</div><br>',$v[1],$v[0],$k,$v[0]);
};
	printf('<div style="margin-top:4px;" data-url="%s" data-text="%s" data-code="%s" class="hdrWideButtons18">%s</div><br>','','Inpatient',0,'Inpatient');


echo '</div>';

			break;
			
			};						
			case 'status':{
			

printf( '<div id="pat-stat">');
foreach ($refStatus as $k => $v) {
	printf('<div data-text="%s" data-status="%s" class="hdrWideButtons16">%s</div>',$v,$k,$v);
};
echo '</div>';			
			break;
			
			
			};			
			case "frailty":{
		
echo '<div id="frailty" >';

foreach ($frailtyScale as $k => $v) {
	printf('<div data-name="%s" data-code="%s" class="hdrWideButtons10">%s</div><br>',$v,$k,$v);
};
	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons10">%s</div>','Not set',0,'Not set');
echo '</div>';

			break;
			
			};
			case "followup":{
		
echo '<div id="fu" >';

foreach ($followupTypes as $k => $v) {
	printf('<div data-name="%s" data-code="%s" class="hdrWideButtons21">%s</div><br>',$v,$k,$v);
};
	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons21">%s</div>','Not set',0,'Not set');
echo '</div>';

			break;
			
			};
			case "ddest":{
		
echo '<div id="ddest" >';

foreach ($dischargeDest as $k => $v) {
	printf('<div data-name="%s" data-code="%s" class="hdrWideButtons20">%s</div><br>',$v,$k,$v);
};
	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons20">%s</div>','Not set',0,'Not set');
echo '</div>';

			break;
			
			};
			case "mobility":{
		
echo '<div id="mobility" >';

foreach ($mobilityScale as $k => $v) {
	printf('<div data-name="%s" data-code="%s" class="hdrWideButtons11">%s</div><br>',$v,$k,$v);
};
	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons11">%s</div>','Not set',0,'Not set');
echo '</div>';

			break;
			
			};
			case "pathways":{

// Development bodge
// $_REQUEST['touch'] = 'true';

echo '<div id="pathways">';
if ($_REQUEST['touch'] == 'false') {
	// Flash-based
	foreach (file_array(PATHWAYS_PATH) as $file) {
		if (substr($file,0,1)=='.') continue;
		printf	('<div data-width="220px" data-file="%s" class="hdrWideButtons4">%s</div><br/>',$file,substr($file, 0, strrpos($file, '.')) );
	};
}
else
{
	// PDF-based
	foreach (file_array(PATHWAYS_PDF_PATH) as $file) {
	if (substr($file,0,1)=='.') continue;
	printf	('<div data-description="%s" data-visitid="0" data-type="0" data-width="220px" data-file="%s" class="hdrWideButtons5">%s</div><br/>',substr($file, 0, strrpos($file, '.')),PATHWAYS_PDF_EXTERNAL.$file,substr($file, 0, strrpos($file, '.')) );
};


};
echo '</div>';
break;
};
			case "nursing":{
$sql = sprintf("SELECT * FROM `med_pmhx` WHERE `comorb` REGEXP '%s';",$_REQUEST['term']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
	for ($loop = 0, $numrows = mysql_num_rows($dbQuery); $loop < $numrows; $loop++) {  
    	$row = mysql_fetch_assoc($dbQuery);  
    	$r[$loop] = array("value" => $row["id"], "label" => $row['comorb']);  
	} 
	echo json_encode($r);
};
break;};
			case "medic":{
$sql = sprintf("SELECT * FROM `med_activehx` WHERE `comorb` REGEXP '%s';",$_REQUEST['term']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
	for ($loop = 0, $numrows = mysql_num_rows($dbQuery); $loop < $numrows; $loop++) {  
    	$row = mysql_fetch_assoc($dbQuery);  
    	$r[$loop] = array("value" => $row["id"], "label" => $row['comorb']);  
	} 
	echo json_encode($r);
};
break;};
			case "lists-main":{
			
			
$_list = array(1,2,5,18);
echo '<div id="lists-profs" >';

foreach ($baseAuthorRole as $k => $v) {

if (in_array($k,$_list)) continue;
if ($k==127) continue;

	$sql = sprintf("SELECT * FROM mau_referral r, mau_patient p, mau_visit v
WHERE p.id=v.patient
AND v.site='%s'
AND v.ward='%s'
AND v.bed != '127'
AND v.status != '4'
AND r.who = '%s'
AND r.status < 4
AND r.visitid = v.id
ORDER BY v.triage, r.rtime;",$_REQUEST['site'],$_REQUEST['ward'],$k);
	$listQuery = mysql_query($sql);
	if (mysql_num_rows($listQuery) != 0) {
		$_ref = array();
		while ($_row = mysql_fetch_array($listQuery, MYSQL_ASSOC)) {
			$_ref[]=$_row['id'];
		};
		printf('<div data-number="%s" data-name="%s" data-list="%s" class="hdrWideButtons3">%s</div><br>',count(array_unique($_ref)),$v[0],$k,$v[0]);
	}
	else
	{
		printf('<div data-number="0" data-name="%s" data-list="%s" class="hdrWideButtons3">%s</div><br>',$v[0],$k,$v[0]);
	};
	mysql_free_result($listQuery);

};


echo '</div>';


break;
			
			
			};
			case "lists-sub":{
$_list = array(1,2,5,18);
echo '<div id="lists-sub" >';

$_consultantNumberToSee = 0;
$_forClerking=0;
foreach ($_list as $k) {

	$sql = sprintf("SELECT * FROM mau_referral r, mau_patient p, mau_visit v
WHERE p.id=v.patient
AND v.site='%s'
AND v.ward='%s'
AND v.bed != '127'
AND v.status != '4'
AND r.who = '%s'
AND r.status < 4
AND r.visitid = v.id
ORDER BY v.triage, r.rtime;",$_REQUEST['site'],$_REQUEST['ward'],$k);
	$listQuery = mysql_query($sql);
	if (mysql_num_rows($listQuery) != 0) {
		$_ref = array();
		while ($_row = mysql_fetch_array($listQuery, MYSQL_ASSOC)) {
			$_ref[]=$_row['id'];
		};
		printf('<div data-number="%s" data-name="%s" data-list="%s" class="hdrWideButtons3">%s</div><br>',count(array_unique($_ref)),$baseAuthorRole[$k][0],$k,$baseAuthorRole[$k][0]);
		if ($k==18) $_consultantNumberToSee = count(array_unique($_ref));
		if ($k==1) $_forClerking = count(array_unique($_ref));
	}
	else
	{
		printf('<div data-number="0" data-name="%s" data-list="%s" class="hdrWideButtons3">%s</div><br>',$baseAuthorRole[$k][0],$k,$baseAuthorRole[$k][0]);
	};
	mysql_free_result($listQuery);

};

printf('<div id="lists-other">Other…</div><br>');
printf('<div style="margin-top:4px;" id="lists-byconsultant">By consultant…</div><br>');
printf('<div id="lists-bydestination">By destination…</div><br>');
printf('<div id="lists-bysuggested">By suggested ward…</div><br>');

$sql = sprintf("SELECT * FROM `mau_visit` WHERE `handover` = '1' AND `handate` >= '%s' AND `site` = '%s' AND status != '4'",date('Y-m-d 11:00:00'),$_REQUEST['site']);
$listQuery = mysql_query($sql);
if (mysql_num_rows($listQuery) != 0) {
	printf('<div data-number="%s" style="margin-top:4px;" data-name="Handover" data-list="403" class="hdrWideButtons3 _all">Handover</div><br>',mysql_num_rows($listQuery));

} else {
	printf('<div style="margin-top:4px;" data-name="Handover" data-list="403" class="hdrWideButtons3 _all">Handover</div><br>');
};
mysql_free_result($listQuery);


// 		$sql = sprintf ("SELECT *, 0 AS pred FROM mau_patient p, mau_visit v
// 		WHERE p.id=v.patient
// 		AND v.site='$trakSite'
// 		AND v.ward='$trakWard'
// 		AND v.status != '4'
// 		AND (v.sugward = '126'
// 		OR v.nldok = '1')
// 		ORDER BY v.ward,v.bed;");

$sql = sprintf("SELECT * FROM `mau_visit` WHERE (`sugward` = '126' OR `nldok` = '1') AND `site` = '%s' AND `ward` = '%s' AND status != '4'",$_REQUEST['site'],$_REQUEST['ward']);
$listQuery = mysql_query($sql);
if (mysql_num_rows($listQuery) != 0) {
	printf('<div data-number="%s" style="margin-top:4px;" data-name="Discharge" data-list="404" class="hdrWideButtons3 _all">Discharge</div><br>',mysql_num_rows($listQuery));

} else {
	printf('<div style="margin-top:4px;" data-name="Discharge" data-list="404" class="hdrWideButtons3 _all">Discharge</div><br>');
};
mysql_free_result($listQuery);




$sql = sprintf("SELECT * FROM `mau_visit` WHERE `dsite` = %s AND `status` = 1",$_REQUEST['site']);
$listQuery = mysql_query($sql);
if (mysql_num_rows($listQuery) != 0) {
	printf('<div style="margin-top:4px;" data-number="%s" data-name="Referred" data-list="201" class="hdrWideButtons3">Referred</div><br>',mysql_num_rows($listQuery));
} else {
	printf('<div data-name="Referred" data-list="201" class="hdrWideButtons3">Referred</div><br>');
};
mysql_free_result($listQuery);
$sql = sprintf("SELECT * FROM `mau_visit` WHERE `dsite` = %s AND `status` = 0",$_REQUEST['site']);
$listQuery = mysql_query($sql);
if (mysql_num_rows($listQuery) != 0) {
	printf('<div style="margin-bottom:4px;" data-number="%s" data-name="Predicted" data-list="200" class="hdrWideButtons3">Predicted</div><br>',mysql_num_rows($listQuery));
} else {
	printf('<div style="margin-bottom:4px;" data-name="Predicted" data-list="200" class="hdrWideButtons3">Predicted</div><br>');
};
mysql_free_result($listQuery);

$_list = array(

	1	=>	410,
	18	=>	400
	
	);
foreach ($_list as $k => $v) {

	$sql = sprintf("SELECT * FROM mau_referral r, mau_patient p, mau_visit v
WHERE p.id=v.patient
AND v.site='%s'
AND v.bed != '127'
AND v.status != '4'
AND r.who = '%s'
AND r.status < 4
AND r.visitid = v.id
ORDER BY v.triage, r.rtime;",$_REQUEST['site'],$k);
	$listQuery = mysql_query($sql);
	if (mysql_num_rows($listQuery) != 0) {
		$_ref = array();
		while ($_row = mysql_fetch_array($listQuery, MYSQL_ASSOC)) {
			$_ref[]=$_row['id'];
		};
		$_fl='';
		if (($k==18)&&($_consultantNumberToSee<count(array_unique($_ref)))) {$_fl=' _buttonfl';};
		if (($k==1)&&($_forClerking<count(array_unique($_ref)))) {$_fl=' _buttonfl';};
		printf('<div data-number="%s" data-name="%s" data-list="%s" class="hdrWideButtons3 _all%s">%s</div><br>',count(array_unique($_ref)),'↻ '.$baseAuthorRole[$k][0],$v,$_fl,$baseAuthorRole[$k][0]);
	}
	else
	{
		printf('<div data-number="0" data-name="%s" data-list="%s" class="hdrWideButtons3 _all">%s</div><br>','↻ '.$baseAuthorRole[$k][0],$v,$baseAuthorRole[$k][0]);
	};
	mysql_free_result($listQuery);

};













// $sql = sprintf("SELECT * FROM mau_referral r, mau_patient p, mau_visit v
// 		WHERE p.id=v.patient
// 		AND v.site='%s'
// 		AND v.status != '4'
// 		AND r.who = '18'
// 		AND r.status < 4
// 		AND r.visitid = v.id
// 		ORDER BY v.triage, r.rtime;",$_REQUEST['site']);
// $listQuery = mysql_query($sql);
// if (mysql_num_rows($listQuery) != 0) {
// 	printf('<div %sstyle="margin-top:4px;" data-number="%s" data-name="PTWR" data-list="400" class="hdrWideButtons3">PTWR</div><br>', $_consultantNumberToSee ==  mysql_num_rows($listQuery) ? '' : 'id="makeFlash" ', mysql_num_rows($listQuery));
// }
// else
// {
// 	printf('<div style="margin-top:4px;" data-name="PTWR" data-list="400" class="hdrWideButtons3">PTWR</div><br>');
// };
// mysql_free_result($listQuery);
// 
// 
// 
// 
// 
// $sql = sprintf("SELECT * FROM mau_referral r, mau_patient p, mau_visit v
// 		WHERE p.id=v.patient
// 		AND v.site='%s'
// 		AND v.status != '4'
// 		AND r.who = '1'
// 		AND r.status < 4
// 		AND r.visitid = v.id
// 		ORDER BY v.triage, r.rtime;",$_REQUEST['site']);
// $listQuery = mysql_query($sql);
// if (mysql_num_rows($listQuery) != 0) {
// 	printf('<div %sdata-number="%s" data-name="Clerking" data-list="410" class="hdrWideButtons3">Clerking</div><br>', $_forClerking ==  mysql_num_rows($listQuery) ? '' : 'id="makeFlash" ', mysql_num_rows($listQuery));
// }
// else
// {
// 	printf('<div data-name="Clerking" data-list="410" class="hdrWideButtons3">Clerking</div><br>');
// };
// mysql_free_result($listQuery);










echo '</div>';


break;};
			case "lists-cons":{
			
	$_list = $consultantsOncall[$_REQUEST['site']];
	asort($_list, SORT_STRING);		
	echo '<div id="lists-consultant" >';
	foreach ($_list as $k => $v) {

$sql = sprintf("SELECT * FROM mau_visit WHERE consoc = '%s' AND site = '%s' AND status != '4';",$k,$_REQUEST['site']);
$listQuery = mysql_query($sql);


		printf('<div data-number="%s" data-code="%s" data-name="%s" class="hdrWideButtons8">%s</div><br>',mysql_num_rows($listQuery),$k,$v,$v);
	};
	printf('<div style="margin-top:4px;" data-code="127" data-name="Locum" class="hdrWideButtons8">Locum</div><br>');
	printf('<div style="margin-top:4px;" data-code="0" data-name="No consultant" class="hdrWideButtons8">Not set</div><br>');
	echo '</div>';


break;
			
			
			};
			case "lists-dest":{
			
	$_list = $consultantsOncall[$_REQUEST['site']];
	asort($_list, SORT_STRING);		
	echo '<div id="lists-destination" >';
	foreach ($baseWards[$_REQUEST['site']] as $k => $v) {
		if ($v[0][0] == '(') continue; // Don't show commented-out wards


$sql = sprintf("SELECT * FROM mau_visit WHERE dward = '%s' AND dsite = '%s' AND status != '4';",$k,$_REQUEST['site']);
$listQuery = mysql_query($sql);


		printf('<div data-number="%s" data-code="%s" data-name="%s" class="hdrWideButtons24">%s</div><br>',mysql_num_rows($listQuery),$k,'➟'.$v[1],$v[0]);
	};


// 	foreach ($_list as $k => $v) {
// 		printf('<div data-code="%s" data-name="%s" class="hdrWideButtons8">%s</div><br>',$k,$v,$v);
// 	};
//	printf('<div style="margin-top:4px;" data-code="127" data-name="Locum" class="hdrWideButtons8">Locum</div><br>');
//	printf('<div style="margin-top:4px;" data-code="0" data-name="No consultant" class="hdrWideButtons8">Not set</div><br>');
	echo '</div>';


break;
			
			
			};
			case "lists-sug":{
			
	$_list = $consultantsOncall[$_REQUEST['site']];
	asort($_list, SORT_STRING);		
	echo '<div id="lists-suggested" >';

	//printf('<div style="margin-bottom:4px;" data-name="%s" data-code="%s" class="hdrWideButtons26">%s</div>','Any medical ward',127,'Any medical ward');


	foreach ($baseWards[$_REQUEST['site']] as $k => $v) {
		if ($v[0][0] == '(') continue; // Don't show commented-out wards



$sql = sprintf("SELECT * FROM mau_visit WHERE sugward = '%s' AND site = '%s' AND status != '4';",$k,$_REQUEST['site']);
$listQuery = mysql_query($sql);


		printf('<div data-number="%s" data-code="%s" data-name="%s" class="hdrWideButtons26">%s</div><br>',mysql_num_rows($listQuery),$k,'♥ '.$v[1],$v[0]);






	};
	printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons26">%s</div>','Any medical ward',127,'Any medical ward');

	// printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons26">%s</div>','Discharge',126,'Discharge');
	// printf('<div style="margin-top:4px;" data-name="%s" data-code="%s" class="hdrWideButtons26">%s</div>','Not set',0,'Not set');


	echo '</div>';


break;
			
			
			};



			case "patBoxSub":{

printf ('<td colspan="1"><center>⤷</center></td><td class="_but" colspan="4">',$_REQUEST['id']);

	$query  = dbGet("mau_visit",$_REQUEST['id']);
	$nQuery = dbGet("mau_patient",$query['patient']);

			if	(($_REQUEST['fID']=='0') && ($_REQUEST['lID']=='0'))
			{
				// echo 'Plain ';
				if (($query['site'] == $_REQUEST['sID']) && ($query['ward'] == $_REQUEST['wID']))
				{
					//echo 'On displayed ward';




				}
				else
				{
					//echo 'Not on displayed ward';		
					
					
					

echo	'<div class="dialogButtons" style="float:left;">';
foreach ($baseAccept as $k => $v) {
	printf	('<input %svalue="%s" data-visitid="%s" type="radio" id="acc%s" name="action-accept" /><label for="acc%s">%s</label>',
				$query['accept'] == $k ? 'checked="checked" ' : "",
				$k,$_REQUEST['id'],$k,$k,$v);};
echo	"</div>";



		
				};
			}
			else
			{
				//echo 'Filtered ';
			};

	
if ($_REQUEST['status'] == 1 || $_REQUEST['status'] == 0)
{
		printf ('<div class="patient-sbar" data-visitid="%s">Info</div>',$_REQUEST['id']);
		//		printf ('<a class="pBSButtonMove editPat" href="http://'.HOST.'/index.php?act=formEditPat&vid=%s">Move</a>',$_REQUEST['id']);
		printf ('<div class="patient-edit" data-visitid="%s">Move</div>',$_REQUEST['id']);

} else
{
//		printf ('<a class="pBSButtonMove movePat" href="http://'.HOST.'/index.php?act=formMovePat&amp;vid=%s">Move</a>',$_REQUEST['id']);

		printf ('<div class="patient-move" data-visitid="%s">Move</div>',$_REQUEST['id']);


};




//		printf ('<a class="pBSButtonRefEdit refEdit" href="http://'.HOST.'/index.php?act=formAddRef&amp;vid=%s">Refer</a>',$_REQUEST['id']);
//		printf ('<a class="pBSButtonDoc mauDocu" href="http://'.HOST.'/doc.php?id=%s">Documents</a>',$_REQUEST['id']);
//		printf ('<a class="pBSButtonHAN refEdit" href="http://'.HOST.'/index.php?act=formAddRef&amp;vid=%s&amp;type=127">HAN</a>',$_REQUEST['id']);
//		printf ('<a class="pBSButtonRx rxEdit" href="http://'.HOST.'/index.php?act=formEditRx&amp;vid=%s">Rx</a>',$_REQUEST['id']);
//		printf ('<a class="pBSButtonNursing nursingEdit" href="http://'.HOST.'/index.php?act=formEditNursing&amp;vid=%s">Nursing</a>',$_REQUEST['id']);
//		printf ('<a style="float:right;" class="pBSButtonDisc discPat" href="http://'.HOST.'/index.php?act=formDiscPat&vid=%s" data-visitid="%s">Discharge</a>',$_REQUEST['id'],$_REQUEST['id']);

printf ('<div data-type="127" data-visitid="%s" class="patient-refer">HAN</div>',$_REQUEST['id']);

//printf ('<a class="pBSButtonNote noteEdit" href="http://'.HOST.'/index.php?act=formAddNote&amp;vid=%s">Note</a>',$_REQUEST['id']);
//echo '&nbsp;&nbsp;';

printf ('<div data-visitid="%s" class="patient-refer">Refer</div>',$_REQUEST['id']);

//printf ('<div data-visitid="%s" class="document-clerking">Clerking</div>',$_REQUEST['id']);


printf ('<div data-visitid="%s" data-patientid="%s" class="patient-jobs">Job</div>',$_REQUEST['id'],$nQuery['id']);

printf ('<div data-visitid="%s" class="patient-note">Entry</div>',$_REQUEST['id']);
//printf ('<div data-pas="%s" class="patient-labcentre">Labs</div>',$nQuery['pas']);
//printf ('<div data-pas="%s" class="patient-prism">Prism</div>',$nQuery['pas']);
//printf ('<div data-visitid="%s" class="document-letter">Letter</div>',$_REQUEST['id']);
printf ('<div data-visitid="%s" class="patient-documents">Docs</div>',$_REQUEST['id']);
//printf ('<div class="patient-consultants-mau">Cons MAU</div>');
//printf ('<div class="patient-consultants-oc">Cons On-call</div>');

		$noteQuery = mysql_query("SELECT id FROM mau_note WHERE visitid=" . $_REQUEST['id']);
		if (!$noteQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}
		if (mysql_num_rows($noteQuery) >= '1') {
			printf ('<div data-number="%s" data-visitid="%s" class="patient-notes">Notes&nbsp;&nbsp;</div>',mysql_num_rows($noteQuery),$_REQUEST['id']);
		}
		else
		{
			printf ('<div data-number="0" data-visitid="%s" class="patient-notes">Notes</div>',$_REQUEST['id']);
		};
		mysql_free_result($noteQuery);

printf ('<div data-dxdone="%s" data-visitid="%s" class="patient-discharge">Discharge%s</div>',$query['dxdone'],$_REQUEST['id'],$query['dxdone'] == 0 ? '' : '');





echo "</td>";			

// END;
			
			break;
			};
			case "bedTrafficLight":{
				if ($_REQUEST['bed'] == 0) {
					echo "tl_amber.png";
					exit;
				};
				$sql = "SELECT dsite from mau_visit
					WHERE site   = {$_REQUEST['site']}
					AND   ward   = {$_REQUEST['ward']}
					AND   bed    = {$_REQUEST['bed']}
					AND   status = 2
					LIMIT 1;";
				$bedQuery = mysql_query($sql);
				if (mysql_num_rows($bedQuery) != 0) {
					$_bedOcc = mysql_fetch_array($bedQuery, MYSQL_ASSOC);
					// Predicted bed is occupied
					if ($_bedOcc['dsite'] == 127) {
						// Patient is predicted to go home today
						$bedTrafficLight = 'tl_amber.png';
					} else {
						$bedTrafficLight = 'tl_red.png';
					};
				} else {
				// Bed is empty
					$bedTrafficLight = 'tl_green.png';
				};
				echo $bedTrafficLight;
				break;

};
			case "updateReferral":{
				$map = array(
					'status'      => $_REQUEST['status']
				);
				dbPut(UPDATE,"mau_referral",$map,$_REQUEST['id']);
				if ($_REQUEST['status'] == "2") {
					// Referral is complete, so add time to database
					dbTime("mau_referral",$_REQUEST['id'],"dtime");
					// Clear triage (only 1-3 as other values used for other purposes)
					$triQuery = mysql_query("SELECT triage FROM mau_visit WHERE id=" . $_REQUEST['vid']);
					while ($triResult = mysql_fetch_array($triQuery, MYSQL_ASSOC)) {
						if ($triResult['triage'] == "1" || $triResult['triage'] == "2" || $triResult['triage'] == "3") {
							dbPut(UPDATE,"mau_visit",array('triage' => 0),$_REQUEST['vid']);
						};
					};
				};
				if ($_REQUEST['status'] == "1") {
					// Referral is accepted, so add time to database
					dbTime("mau_referral",$_REQUEST['id'],"stime");
				};
				break;};
			case "serverTime":{
				$now = new DateTime(); echo $now->format("M j, Y H:i:s O")."\n";
				break;};
			case "ref":{
				$refQuery  = mysql_query("SELECT * FROM mau_referral WHERE id=" . $_REQUEST['refid']);
				while ($refResult = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
					printf ('<button id="refAccept_%s">Acccept</button>',$_REQUEST['refid']);
					printf ('<button id="refComplete_%s">Complete</button>',$_REQUEST['refid']);
					printf ("<br />RefID: %s, VisID: %s",$_REQUEST['refid'],$_REQUEST['vid']);
echo <<<JS
<script type="text/javascript"><!--
$(function() {
		$("#refAccept_{$_REQUEST['refid']}").button({ icons: { primary: "ui-icon-gear" }, text: true });
		$("#refComplete_{$_REQUEST['refid']}" ).button({ icons: { primary: "ui-icon-gear" }, text: true });
		$("#refAccept_{$_REQUEST['refid']}").click(function(){
			$.ajax({
				type: 	"POST",
				url:  	"http://" + HOST + "/index.php",
				data:	{
						act:	"ajax",
						type:	"updateReferral",
						id:		"{$_REQUEST['refid']}",
						vid:	"{$_REQUEST['vid']}",
						status:	"1"
						},
				success: function(data){
					$("#refImg_" + {$_REQUEST['refid']}).css({opacity:0.2});     // Dull referral icon
					$("#cdn_" + {$_REQUEST['refid']}).countdown('destroy');      // Remove stopwatch
					$("#cdnOuter_" + {$_REQUEST['refid']}).hide(); // ?empty();  // Kill stopwatch icon
					}
			});
		});
		$("#refComplete_{$_REQUEST['refid']}").click(function(){
			$.ajax({
				type: 	"POST",
				url:  	"http://" + HOST + "/index.php",
				data:	{
						act:	"ajax",
						type:	"updateReferral",
						id:		"{$_REQUEST['refid']}",
						vid:	"{$_REQUEST['vid']}",
						status:	"2"
						},
				success: function(data){					
					$("#refImg_" + {$_REQUEST['refid']}).hide();       // Hide referral icon
					remBubble({$_REQUEST['refid']});				   // Kill popup
					$("#triage_" + {$_REQUEST['vid']}).hide();		   // Kill triage icon
					$("#cdn_" + {$_REQUEST['refid']}).countdown('destroy');      // Remove stopwatch (in case no intermediate)
					$("#cdnOuter_" + {$_REQUEST['refid']}).hide(); // ?empty();  // Kill stopwatch icon
					// delvR({$_REQUEST['vid']}, {$_REQUEST['refid']});// Not used ATM
					}
			});
		});
});
--></script>
JS;
				};
				break;};
			case "edit":{
				$map = array(
					'iee' => $_REQUEST['value']
					);
				dbPut(UPDATE,"mau_visit",$map,trim($_REQUEST['id'],"editable_"));
				echo htmlspecialchars($map['iee']);
				break;};
			case "site":{
				$wardList = $baseWards[$_REQUEST['id']]; $loop=0;
				foreach ($wardList as $ward) {
					printf ('<option %svalue="%s">%s</option>', $loop,$ward);
					$loop++;
				};
				break;};
			case "notes":{
//sleep(5);

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; //  = "trak";
		$__AES  = new AesCtr;

		$jsFooter='';
		



				echo '<div class="notePaper"><div>';

switch ($_REQUEST['filter']):
case '1':{

$query = dbGet("mau_visit",$_REQUEST['vid']);
$nQuery = dbGet("mau_patient",$query['patient']);
$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);

echo <<<HTML

<span class="_R">
<img src="gfx/patlh.png" width="250" height="30" />
</span>

HTML;


echo '<p class="_noteHeader">';
// echo $nQuery['name'] . " ";

printf ('<span id="_noteName_%s">', $_REQUEST['vid']  );
echo $__AES->encrypt($nQuery['name'], $__PW, 256);
$jsFooter .= sprintf('trak.fn.decode("#_noteName_%s");',  $_REQUEST['vid']  );
echo '</span>';

echo date(" j/n/Y",strtotime($nQuery['dob'])) . " ";
echo $nQuery['pas'];
echo '</p>';

echo '<p class="_noteHeader">Admission Summary</p>';

echo '<table class="_noteSummary"><tbody>';
echo '<tr>';
echo '<td style="color:#888">Admission date and time</td>';
echo '<td style="color:#888">';
echo date("d/M/Y g:i a", strtotime($query['admitdate']));
echo '</td>';
echo '</tr>';

echo '<tr>';
echo '<td>Presenting complaint</td>';
echo '<td>';
//echo $notes['pc'];
echo $notes['SBARs'];

echo '</td>';
echo '</tr>';

echo '<tr>';
echo '<td>Active problems</td>';
echo '<td>';

$sql = sprintf("SELECT * FROM mau_activehx,med_activehx
		WHERE patient = %s
		AND mau_activehx.cond = med_activehx.id
		ORDER BY mau_activehx.id;",
		$nQuery['id']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query (activehxDisplay): ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
while ($_drug = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
// echo '<ol class="_hxList">';
echo			$_drug['comorb'] . '<br />';
//echo '</ol>';
}
}

echo '</td>';
echo '</tr>';
echo '<tr>';
echo '<td>Past medical history</td>';
echo '<td>';

$sql = sprintf("SELECT * FROM mau_pmhx,med_pmhx
		WHERE patient = %s
		AND mau_pmhx.cond = med_pmhx.id
		ORDER BY mau_pmhx.id;",
		$nQuery['id']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query (pmhxDisplay): ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
while ($_drug = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {


echo			$o_name	= $_drug['comorb'];
echo "<br />";

}
}

echo '</td>';
echo '</tr>';

echo '<tr>';
echo '<td style="color:#888">Estimated date of discharge</td>';

if (strtotime($query['edd']) < time())
{
	echo '<td class="_fl">';
}
else
{
	echo '<td style="color:#888">';
};
echo date("d/M/Y", strtotime($query['edd']));
echo '</td>';
echo '</tr>';

echo '</tbody></table>';

echo '<p class="_noteHeader">Nursing summary</p>';

echo '<table class="_noteSummary"><tbody>';
echo '<tr>';
echo '<td style="color:#888">Plan</td>';
echo '<td>';
echo $notes['plan'];
echo '</td>';
echo '</tr>';
echo '<tr>';
echo '<td style="color:#888">Jobs</td>';
echo '<td>';
echo $notes['jobs'];
echo '</td>';
echo '</tr>';
echo '<tr>';
echo '<td style="color:#888">Frailty</td>';
echo '<td>';
echo $query['frailty'] == 0 ? 'Not set' :  $frailtyScale[$query['frailty']];
echo '</td>';
echo '</tr>';
echo '<tr>';
echo '<td style="color:#888">Mobility</td>';
echo '<td>';
echo $query['mobility'] == 0 ? 'Not set' :  $mobilityScale[$query['mobility']];
echo '</td>';
echo '</tr>';
echo '<tr>';
echo '<td style="color:#888">Clinical risk</td>';
echo '<td>';
echo $query['eotbt'] == 0 ? 'Not set' : $baseEOTBT[$query['eotbt']];
echo '</td>';
echo '</tr>';
echo '</table>';




echo '<p class="_noteHeader">Notes</p>';




				$noteQuery = mysql_query("SELECT * FROM mau_note WHERE visitid=" . $_REQUEST['vid']);
				if (!$noteQuery) {
    				echo 'Could not run query: ' . mysql_error();
    				exit;
				}

				echo '<p class="_noteLinks">';
				while ($innerrow = mysql_fetch_array($noteQuery, MYSQL_ASSOC)) {
					printf ('<span class="note-jump ui-button" data-jump="_noteRef_%s">&rarr;</span> %s %s<br />',$innerrow['id'],date("d/M/Y g:i a", strtotime($innerrow['ctime'])),$baseAuthorRole[$innerrow['role']][0]); 
				};
				echo '</p>';

				// Reset fetch to allow query to be reused
				// - error-suppressed in case no results had been returned
				@mysql_data_seek($noteQuery, 0); 
				while ($innerrow = mysql_fetch_array($noteQuery, MYSQL_ASSOC)) {
					printf ('<p class="_noteHeader" id="_noteRef_%s">%s %s (%s) <span class="note-top ui-button">&uarr;</span></p>',$innerrow['id'],date("d/M/Y g:i a", strtotime($innerrow['ctime'])),htmlspecialchars($innerrow['author'],ENT_QUOTES),$baseAuthorRole[$innerrow['role']][0]); // htmlspecialchars($innerrow['author'],ENT_QUOTES)  $baseAuthorRole[$innerrow['role']][0]   date("D M j g:i a", strtotime($innerrow['ctime']))   ;
//					printf ('<i><span id="noteID_%s">%s</span> <a class="noteEdit" href="http://'.HOST.'/index.php?act=formAddNote&amp;id=%s"><img src="gfx/Edit.png" width="22" height="22" border="0" /></a></i>',$innerrow['id'], nl2br(htmlspecialchars($innerrow['note'],ENT_QUOTES))  ,  $innerrow['id']);
//					printf ('<i><span id="noteID_%s">%s</span> <a class="noteEdit" href="http://'.HOST.'/index.php?act=formAddNote&amp;id=%s"><img src="gfx/Edit.png" width="22" height="22" border="0" /></a></i>',$innerrow['id'], $__AES->encrypt( nl2br(htmlspecialchars($innerrow['note'],ENT_QUOTES)) , $__PW, 256)  ,  $innerrow['id']);

printf (	'<i><span id="noteID_%s">%s</span>',
			$innerrow['id'],
			$__AES->encrypt( nl2br(htmlspecialchars($innerrow['note'],ENT_QUOTES)) , $__PW, 256)
		);

printf (	'<span data-noteid="%s" class="patient-note"> <img src="gfx/Text-Edit-icon.png" width="22" height="22" border="0" /></span></i>',
			$innerrow['id']
		);





//$jsFooter .= sprintf('trak.fn.decode("#noteID_%s");',  $innerrow['id']  );
$decodeArray[] = $innerrow['id'];
				};

				mysql_free_result($noteQuery);

			 echo '<script type="text/javascript">' . "\n";
			 echo $jsFooter;

if (isset($decodeArray))
{
			 echo 'var decodeIDList = [' . implode(',',$decodeArray) . '];';
}
else
{
			 echo 'var decodeIDList = [];';

};
			 echo "\n" . '</script>';

break;
};
case '2':{

$refQuery = mysql_query("SELECT * FROM mau_referral WHERE visitid=" . $_REQUEST['vid']);
$query = dbGet("mau_visit",$_REQUEST['vid']);
$nQuery = dbGet("mau_patient",$query['patient']);


$jsFooter .= 'var decodeIDList = [];';

if (!$refQuery) {
	echo 'Could not run query: ' . mysql_error();
	exit;
};

echo <<<HTML

<span class="_R">
<img src="gfx/patlh.png" width="250" height="30" />
</span>

HTML;

echo '<p class="_noteHeader">';
printf ('<span id="_noteName_%s">', $_REQUEST['vid']  );
echo $__AES->encrypt($nQuery['name'], $__PW, 256);
$jsFooter .= sprintf('trak.fn.decode("#_noteName_%s");',  $_REQUEST['vid']  );
echo '</span>';
echo date(" j/n/Y",strtotime($nQuery['dob'])) . " ";
echo $nQuery['pas'];
echo '</p>';

echo '<p class="_noteHeader">Referrals Summary</p>';
echo '<table class="_noteSummary"><tbody>';
echo '<tr>';
echo '<td style="color:#888">';
echo 'To';
echo '</td>';
echo '<td style="color:#888">';
echo 'Referral summary';
echo '</td>';
echo '<td style="color:#888">';
echo 'Advice';
echo '</td>';
echo '</tr>';

while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
				if (in_array($_referral['who'],array(1,2,5,18))) continue;
$noteHx = dbGetNote($_referral['id'],NOTE_REFHX);
$noteDx = dbGetNote($_referral['id'],NOTE_REFDX);

echo '<tr>';
echo '<td>';

printf ('<img data-type="%s" data-refid="%s" data-visitid="%s" class="patient-referral" src="gfx/%s" width="22" height="22" /><br />%s',
$_referral['who'],
$_referral['id'],
$_REQUEST['vid'],
$baseAuthorRole[$_referral['who']][1],
$baseAuthorRole[$_referral['who']][0]);


if ($_referral['status']) {
echo '<br />';
echo '<span style="color:#888;">' . $refStatus[$_referral['status']] . '</span>';
};
echo '</td>';
echo '<td>';

if (strlen($noteHx['note']) != 0)
{
	printf ('<i><span id="_refHx_%s">', $noteHx['id'] );
	echo $__AES->encrypt($noteHx['note'], $__PW, 256);
	$jsFooter .= sprintf('trak.fn.decode("#_refHx_%s");',  $noteHx['id']  );
	echo '</span></i>';
};

echo '</td>';
echo '<td>';

if (strlen($noteDx['note']) != 0)
{
	printf ('<i><span id="_refDx_%s">', $noteDx['id'] );
	echo $__AES->encrypt($noteDx['note'], $__PW, 256);
	$jsFooter .= sprintf('trak.fn.decode("#_refDx_%s");',  $noteDx['id']  );
	echo '</span></i>';
};

echo '</td>';
echo '</tr>';

// if ($noteHx['note'] !="" && $noteDx['note'] !="") {
// printf ('Consultation by <strong>%s</strong><br />',$baseAuthorRole[$_referral['who']][0]);
// printf ('<span style="float:left;display:block;"><img border="0" width="48" height="48" src="gfx/%s" /></span>',$baseAuthorRole[$_referral['who']][1]);
// echo "Referral history: " . $noteHx['note'];
// echo "<br>";
// echo "Outcome: " . $noteDx['note'];
// echo '<div style="clear:both;" />';
// };

};

echo '<tbody></table>';


echo '<p class="_noteHeader">Jobs Summary</p>';

echo '<table class="_noteSummary"><tbody>';
echo '<tr>';
echo '<td style="color:#888">';
echo 'Job';
echo '</td>';
echo '<td style="color:#888">';
echo 'Due/status';
echo '</td>';
echo '<td style="color:#888">';
echo 'Notes';
echo '</td>';
echo '</tr>';


		$sql = sprintf ("SELECT * FROM mau_events
			WHERE mau_events.vid = %s",
    		$_REQUEST['vid']);
		$jobsQuery = mysql_query($sql); if (!$jobsQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}

	
			while ($_job = mysql_fetch_array($jobsQuery, MYSQL_ASSOC)) {

echo '<tr>';
echo '<td>';
printf ('<img data-jobid="%s" class="patient-jobs" src="%s" width="22" height="22" /><br />%s',$_job['id'],$jobType[$_job['type']][1],$jobType[$_job['type']][0]);
echo '</td>';

echo '<td>';
echo date('d/m/Y H:i a',strtotime($_job['event_start']));
echo '<br />';


foreach (array_reverse($jobStatus,true) as $k => $v)
{
	if ( intval($k&$_job['status'])   )
	{
		$_status = $v;
		$_block  = $k;
		break;
	};
};

if (isset($_block))
{
	echo '<span style="letter-spacing:-7px;color:#888;">';
	foreach ($jobStatus as $k => $v)
	{
		if ($k <= $_block)
		{
			echo '◼	';
		}
		else
		{
			echo '◻';		
		};
	};
	echo '</span>&nbsp;&nbsp;';
};
if (isset($_status))
{
	echo '<span style="color:#888;">' . $_status . '</span>';
};


echo '</td>';

echo '<td>';

// echo $_job['event_desc'];
// echo '<br />';
// echo $_job['event_result'];


if (  (strlen($_job['event_desc']) + strlen($_job['event_desc']))   != 0)
{
	printf ('<i><span id="_event_%s">', $_job['id'] );
	echo $__AES->encrypt(   $_job['event_desc'] . '<br />' . $_job['event_result'] , $__PW, 256);
	$jsFooter .= sprintf('trak.fn.decode("#_event_%s");',  $_job['id']  );
	echo '</span>';
	
	echo '</i>';
};

//printf ('<div data-jobid="%s" class="patient-jobedit"><img src="gfx/Text-Edit-icon.png" width="22" height="22" border="0" /></div>',$_job['id']);





echo '</td>';

// printf ('<div id="jobID_%s" data-jobid="%s" class="jobedit"><img src="%s" width="38" height="38"></div>',$_job['id'],$_job['id'], $jobType[$_job['type']][1]);

			};


echo '<tbody></table>';


			 echo '<script type="text/javascript">' . "\n";
			 echo $jsFooter;
			 echo '</script>';


break;
};
endswitch;


//				echo '</div></div>';







				break;};
			case "patsearch":{
			
		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW;//  = "trak";
		$__AES  = new AesCtr;
		
				$patQuery = mysql_query("SELECT * FROM mau_patient WHERE pas=" . $_REQUEST['pas'] . " LIMIT 1");
				while ($triResult = mysql_fetch_array($patQuery, MYSQL_ASSOC)) {
					echo json_encode(array("id" => $triResult['id'], "name" => $__AES->encrypt($triResult['name'], $__PW, 256),"dob" => date('d/m/Y',strtotime($triResult['dob'])), "gender" => $triResult['gender']));

				};
				break;};
			case "wardlist":{
				foreach ($baseWards[$_REQUEST['site']] as $k => $v) {
					printf	('<input %svalue="%s" type="radio" id="destWard%s" name="destWard" class="clickWard" /><label for="destWard%s">%s</label>', $_REQUEST['ward'] == $k ? 'checked="checked" ': ''    ,$k,$k,$k,$v[1]);
				};
				break;};
			case "wardlistB":{
				foreach ($baseWards[$_REQUEST['site']] as $k => $v) {
					printf	('<input %svalue="%s" type="radio" id="destWard%s" name="destWard" class="clickWardB" /><label for="destWard%s">%s</label>', $_REQUEST['ward'] == $k ? 'checked="checked" ': ''    ,$k,$k,$k,$v[1]);
				};
				break;};
			case "wardlistC":{
				foreach ($baseWards[$_REQUEST['site']] as $k => $v) {
					printf	('<input %svalue="%s" type="radio" id="destWard%s" name="destWard" class="clickWardC" /><label for="destWard%s">%s</label>', $_REQUEST['ward'] == $k ? 'checked="checked" ': ''    ,$k,$k,$k,$v[1]);
				};
				break;};
			case "hdrwardlist":{
				foreach ($baseWards[$_REQUEST['site']] as $k => $v) {
//					printf	('<input value="%s" type="radio" id="dWard%s" name="dWard" /><label rel="%s" class="hdrWideButtons" for="dWard%s">%s</label><br/>',$k,$k,$k,$k,$v[1]);

printf('<div class="hdrWideButtons" data-wid="%s">%s</div><br/>',$k,$v[1]);
				};
				break;}
			case "hdrfilterlist":{

// printf	('<input value="%s" type="radio" id="dFilter%s" name="dFilter" /><label rel="%s" class="hdrWideButtons2" for="dFilter%s">%s</label><br/>',0,0,0,0,"All");
// 
// if(isset($wardFilter[$_REQUEST['site']][$_REQUEST['ward']])){
// foreach ($wardFilter[$_REQUEST['site']][$_REQUEST['ward']] as $k => $v) {
//  	printf	('<input value="%s" type="radio" id="dFilter%s" name="dFilter" /><label rel="%s" class="hdrWideButtons2" for="dFilter%s">%s</label><br/>',$k,$k,$k,$k,$v[0]);
// };
// };
// printf	('<input value="%s" type="radio" id="dFilter%s" name="dFilter" /><label rel="%s" class="hdrWideButtons2" for="dFilter%s">%s</label><br/>',126,126,126,126,"Chairs");
// printf	('<input value="%s" type="radio" id="dFilter%s" name="dFilter" /><label id="vLabel" rel="%s" class="hdrWideButtons2" for="dFilter%s">%s</label><br/>',127,127,127,127,"Virtual");

// $sql = sprintf("SELECT * FROM `mau_visit` WHERE `site` = %s AND `ward` = %s AND `bed` = 127",$_REQUEST['site'],$_REQUEST['ward']);
// $_vQuery = mysql_query($sql);
// if (mysql_num_rows($_vQuery) != 0) {
// $_number = mysql_num_rows($_vQuery);
// echo <<<HTML
// <script type="text/javascript">
// 	$('#vLabel').badger('$_number');
// </script>
// HTML;
// };
	
filter_showButtons($_REQUEST['site'],$_REQUEST['ward']);

				break;};
			case "drug":{
$sql = sprintf ("SELECT * FROM rx_drug
			WHERE name REGEXP '^%s'
    		ORDER BY name",$_REQUEST['term']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
	for ($loop = 0, $numrows = mysql_num_rows($dbQuery); $loop < $numrows; $loop++) {  
    	$row = mysql_fetch_assoc($dbQuery);  
    	$r[$loop] = array("value" => $row["id"], "label" => $row['name'], "cd" => $row['cd']);  
	} 
	echo json_encode($r);
};
break;};
			case "dose":{
//echo json_encode(array($_REQUEST['drug'],'1000','5'));
//break;
$sql = sprintf ("SELECT * FROM rx_dose
			WHERE drugid = '%s'",$_REQUEST['term']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
	for ($loop = 0, $numrows = mysql_num_rows($dbQuery); $loop < $numrows; $loop++) {  
    	$row = mysql_fetch_assoc($dbQuery);  

//  $label = $row['str']
//  		. " "
//  		. $drugUnits[$row['units']][0]
//  		. " × &#"
//  		. ($row['dose']+10111)
//  		. "; "
//  		. $drugFreq[cbits($_drug['time'])][0]
//  		. $drugRoute[$row['route']][1];


    	$r[$loop] = array(
    		
    		"value" => $row["id"],
    		"dose" => $row['dose'],
    		"str" =>  $row['str'],
       		"units" => $row['units'],
       		"time" => $row['time'],
       		"freq" => $row['freq'],
       		"route" => $row['route'],
       		"label" => $row['str'] . ' ' . $drugUnits[$row['units']][0] . " × " . $row['dose'] . " " . $drugFreq[cbits($row['time'])][0] . " " . $drugRoute[$row['route']][1] . " " . $drugReg[$row['freq']]
    	);  
	} 
	echo json_encode($r);
};
break;};

		endswitch;
		break;
};
case "search":{

echo <<<HTML

<tr><td colspan="5">
<input type="text" name="search" autocomplete="off">
</tr></tr>

HTML;

break;};
case "dosearch":{

$sql = sprintf("SELECT * FROM mau_patient p, mau_visit v
    	WHERE p.id=v.patient
    	AND v.status < 4
    	AND v.site = '%s'
    	AND p.name LIKE '%%%s%%'
		",$_REQUEST['site'],$_REQUEST['term']);


	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
   		echo 'Could not run query: ' . mysql_error();
   		exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_result = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
	    	$r[] = array("value" => $_result['id'], "label" => $_result['name']);
		};
	};




    	echo json_encode($r); 

break;
};
case "trakDash":{

$divWidth=919;
$gauges = 4;
$gaugeWidth = 120;
$leftmargin = ($divWidth-($gauges*$gaugeWidth))/2;

// dashSite

// Predicted
$sql = sprintf ("SELECT * FROM `mau_visit` WHERE `site` = %s AND `dsite` = %s AND `status` = 0",$_REQUEST['dashSite'],$_REQUEST['dashSite']);
$sql = sprintf ("SELECT * FROM `mau_visit` WHERE `dsite` = %s AND `status` = 0",$_REQUEST['dashSite']);

$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
$_predicted = mysql_num_rows($dbQuery);

// Accepted
$sql = sprintf("SELECT * FROM `mau_visit` WHERE `site` = %s AND `dsite` = %s AND `status` = 1",$_REQUEST['dashSite'],$_REQUEST['dashSite']);
$sql = sprintf("SELECT * FROM `mau_visit` WHERE `dsite` = %s AND `status` = 1",$_REQUEST['dashSite']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
$_accepted = mysql_num_rows($dbQuery);

// In a bed in MAU
$sql = sprintf("SELECT * FROM mau_patient, mau_visit
		WHERE mau_patient.id=mau_visit.patient
		AND mau_visit.site='%s'
		AND mau_visit.ward='1'
		AND mau_visit.status != '4'
		ORDER BY bed",$_REQUEST['dashSite']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
$_bedsoccupied = mysql_num_rows($dbQuery);

$_numbeds = $baseWards[$_REQUEST['dashSite']][1][2];


// Waiting for doctor (1)
$sql = sprintf ("SELECT * FROM mau_referral,mau_visit WHERE who = 1 AND site = %s AND mau_visit.status = 2 AND mau_visit.id=mau_referral.visitid AND mau_referral.status = 0",$_REQUEST['dashSite']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query: ' . mysql_error();
    exit;
};
$_waiting = mysql_num_rows($dbQuery);






printf ('<td colspan="5">');
printf ('<div id="trakDashboardA" style="margin-left:%spx;"></div>',intval($leftmargin));
printf ('<div id="trakDashboardB" style="margin-left:0px;"></div>');

echo <<<END
<script type="text/javascript">

gaugeData = new google.visualization.DataTable();
gaugeData.addColumn('number', 'Predicted');
gaugeData.addColumn('number', 'Referred');
gaugeData.addColumn('number', 'Waiting');
gaugeData.addRows(4);
gaugeData.setCell(0, 0, $_predicted);
gaugeData.setCell(0, 1, $_accepted);
gaugeData.setCell(0, 2, $_waiting);

gaugeDataC = new google.visualization.DataTable();
gaugeDataC.addColumn('number', 'Occupancy');
gaugeDataC.addRows(1);
gaugeDataC.setCell(0, 0, $_bedsoccupied);

gauge = new google.visualization.Gauge(document.getElementById('trakDashboardA'));
gaugeC = new google.visualization.Gauge(document.getElementById('trakDashboardB'));
gaugeOptionsA = {
  min: 0,
  max: 12,
  yellowFrom: 6,
  yellowTo: 10,
  redFrom: 10,
  redTo: 12,
  minorTicks: 3
};
gaugeOptionsB = {
  min: 0,
  max: $_numbeds,
  yellowFrom: $_numbeds-8,
  yellowTo: $_numbeds-4,
  redFrom: $_numbeds-4,
  redTo: $_numbeds,
  minorTicks: 5,
  majorTicks: ["0","","","","",$_numbeds]
};
gauge.draw(gaugeData, gaugeOptionsA);
gaugeC.draw(gaugeDataC, gaugeOptionsB);

// Gauges hog the whole <tr> width. Each is 116 wide, so explicity set a width
$('#trakDashboardA').css("float","left").css("width","348");
$('#trakDashboardB').css("float","left").css("width","116");

</script>
END;
echo '</td>';


break;
};
case "dbEditDemo":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

		$data = multi_parse_str($__AES->decrypt($_REQUEST['data'],$__PW, 256));
		$splitDate = explode("/",urldecode($data['dob'][0])); // Array as dd mm yyyy
		$splitDateFormatted = $splitDate[2]."-".$splitDate[1]."-".$splitDate[0];
		$map = array(
		
			'name'		=>	urldecode($data['pname'][0]),
			'paddr'		=>	urldecode($data['paddress'][0]),
			'gender'	=>	$data['gender'][0],
			'dob'		=>	$splitDateFormatted,
			'gpname'	=>	urldecode($data['gpname'][0]),
			'gpaddr'	=>	urldecode($data['gpaddress'][0]),
			'pas'		=>	$data['pas'][0],
			'nhs'		=>	$data['nhs'][0]

		);
		dbPut(UPDATE,"mau_patient",$map,$data['pid'][0]);

break;
};
case "dbAddJob":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

		$data = multi_parse_str($__AES->decrypt($_REQUEST['data'],$__PW, 256));
		$req = multi_parse_str($__AES->decrypt($_REQUEST['req'],$__PW, 256));
		$extras = multi_parse_str($__AES->decrypt($_REQUEST['extras'],$__PW, 256));

//print_r($data);
//print_r($req);
//print_r($extras);
//exit;
		
		//print_r($extras);
		//exit;
		
		// event_start = event_end +5min

		// UK-formatted date from front-end. Change to ISO 8601
		$splitDate = explode("/",urldecode($data['event_date'][0])); // Array as dd mm yyyy
		$splitDateFormatted = $splitDate[2]."-".$splitDate[1]."-".$splitDate[0];
		$_event_start = sprintf('%s %s', $splitDateFormatted  , urldecode($data['event_time'][0]) );
// 'xstatus'			=> $data['statusSum'][0],
		$map = array(
				 'id'      			=> $data['id'][0],
				 'event_start' 		=> urldecode($_event_start),
				 'event_end'    	=> urldecode($_event_start),
				 'event_text' 		=> urldecode($data['event_text'][0]),
				 'event_location'	=> urldecode($data['event_location'][0]),
				 'type'				=> $data['type'][0],
				 'event_porter'		=> $data['event_porter'][0],
				 'pID'				=> $data['pID'][0],
				 'vID'				=> $data['vID'][0],
				 'status'			=> $data['patient-jobstatus-code'][0],
				 'event_desc'		=> urldecode($data['event_desc'][0]),
				 'event_result'		=> $__AES->decrypt($_REQUEST['result'],$__PW, 256),
				 'event_data'		=> json_encode($req),
				 'extras'			=> json_encode($extras)
		);

//print_r($map);
//exit;

		if ($data['id'][0] == "") {
			dbPut(INSERT,"mau_events",$map,NULL);
		} else {
			dbPut(UPDATE,"mau_events",$map,$data['id'][0]);
		};
		break;
};
case "dbAddPat":{
		$map = array(
					'pas'    => $_REQUEST['pas'],
					'name'   => $_REQUEST['name'],
					'gender' => $_REQUEST['gender'],
					'dob'    =>  date('Y-m-d',strtotime($_REQUEST['dob']))
				);
		if ($_REQUEST['id'] == "") {
			dbPut(INSERT,"mau_patient",$map,NULL);
		} else {
			dbPut(UPDATE,"mau_patient",$map,$_REQUEST['id']);
		};
		break;
};
case "dbEditPat":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;
		global $baseSites;
		global $baseWards;

		$map		= array(
					'status'    => $_REQUEST['reftype'],
					'dsite'     => $_REQUEST['destSite'],
					'dward'  	=> $_REQUEST['destWard'],
					'dbed'  	=> $_REQUEST['destBed'],
					'triage'	=> $_REQUEST['triage'],
					'ews'  		=> $_REQUEST['ews']
					);
		$mapData	= array(
					'dv'    => $_REQUEST['dv'],
					'bn'    => $_REQUEST['bn'],
					'scs'   => $_REQUEST['scs']
					);

		if ($_REQUEST['reftype'] == "2") {

			// Alert un-triaged patients
			if ($_REQUEST['triage'] == 0) {
				$map['triage'] = 127;
			};
			// Patient has been admitted, so set destinations and add default referrals
			$map['site'] = $_REQUEST['destSite']; $map['ward'] = $_REQUEST['destWard'];
			$map['bed']  = $_REQUEST['destBed'];
			$map['dsite'] = 0; $map['dward'] = 0; $map['dbed']  = 0;
			
			// Creates an array of referrals already made
			$_refs = array(); $refQuery = mysql_query(sprintf("SELECT * FROM mau_referral WHERE visitid = %s",$_REQUEST['id']));
			if (!$refQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		};
			while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
				$_refs[]=$_referral['who'];
			};

 if (!in_array(1,$_refs)) {

			// Refer to doctor
			dbPut(INSERT,"mau_referral",array('visitid' => $_REQUEST['id'],'who' => 1, 'status'  => 1),NULL);
			$insertID=mysql_insert_id();
			dbTime("mau_referral",$insertID,"rtime");
			dbPutNote(INSERT,"",$insertID,NULL,NOTE_REFHX);
			dbPutNote(INSERT,"",$insertID,NULL,NOTE_REFDX);

 };			

 if (!in_array(2,$_refs)) {
 
			// Refer to nurse
			dbPut(INSERT,"mau_referral",array('visitid' => $_REQUEST['id'],'who' => 2, 'status'  => 1),NULL);
			$insertID=mysql_insert_id();
			dbTime("mau_referral",$insertID,"rtime");
			dbPutNote(INSERT,"",$insertID,NULL,NOTE_REFHX);
			dbPutNote(INSERT,"",$insertID,NULL,NOTE_REFDX);

 };			

 if (!in_array(18,$_refs)) {

			// Refer to physician
			dbPut(INSERT,"mau_referral",array('visitid' => $_REQUEST['id'],'who' => 18, 'status'  => 1),NULL);
			$insertID=mysql_insert_id();
			dbTime("mau_referral",$insertID,"rtime");
			dbPutNote(INSERT,"",$insertID,NULL,NOTE_REFHX);
			dbPutNote(INSERT,"",$insertID,NULL,NOTE_REFDX);

 };
 
 if (!in_array(5,$_refs)) {
 			
			// Refer to pharmacist
			dbPut(INSERT,"mau_referral",array('visitid' => $_REQUEST['id'],'who' => 5, 'status'  => 1),NULL);
			$insertID=mysql_insert_id();
			dbTime("mau_referral",$insertID,"rtime");
			dbPutNote(INSERT,"",$insertID,NULL,NOTE_REFHX);
			dbPutNote(INSERT,"",$insertID,NULL,NOTE_REFDX);

 };			

			dbTime("mau_visit",$_REQUEST['id'],"admitdate");
		};
		dbPut(UPDATE,"mau_visit",$map,$_REQUEST['id']);
		dbPut(UPDATE,"mau_data",$mapData,$_REQUEST['nid']);

		$nQuery = dbGet("mau_patient",$_REQUEST['pid']);

		$_out=array(
		
		'name'			=>	$__AES->encrypt($nQuery['name'] , $__PW, 256),
		'destination'	=>	$baseSites[$_REQUEST['destSite']][1] . ' ' . $baseWards[$_REQUEST['destSite']][$_REQUEST['destWard']][0] 
		
		);
		echo json_encode($_out);




		break;
};
case "dbMovePat":{

//print_r($_REQUEST);

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;
		global $baseSites;
		global $baseWards;


		if ($_REQUEST['movetype'] === "0") {
			// Move

			// Are we moving site?
			$query  = dbGet("mau_visit",$_REQUEST['id']);
			if ($query['site'] != $_REQUEST['destSite'])
			{
				// Yes, so need to reset consultants and suggested ward
				$conQuery = mysql_query(sprintf("SELECT consoc FROM `mau_visit` WHERE site = '%s' ORDER by id DESC LIMIT 1",$_REQUEST['destSite']));
				if (!$conQuery) {
   		echo 'Could not run query: ' . mysql_error();
   		exit;
	};
				if (mysql_num_rows($conQuery) != 0) {
		$_conRow = mysql_fetch_array($conQuery, MYSQL_ASSOC);
		$_con = $_conRow['consoc'] != 0 ? $_conRow['consoc'] : 1;
	} else {
		$_con = 1;
	};
				$map = array(
						'dsite'     => 0,
						'dward'  	=> 0,
						'dbed'  	=> 0,
						'site'   	=> $_REQUEST['destSite'],
						'ward'  	=> $_REQUEST['destWard'],
						'bed' 	 	=> $_REQUEST['destBed'],
						'consmau'	=> 0,
						'consoc'	=> $_con,
						'sugward'	=> 0,
						'accepted'	=> 0
						);
			}	
			else
			{
				// No
				$map = array(
						'dsite'     => 0,
						'dward'  	=> 0,
						'dbed'  	=> 0,
						'site'   	=> $_REQUEST['destSite'],
						'ward'  	=> $_REQUEST['destWard'],
						'bed' 	 	=> $_REQUEST['destBed'],
						'accepted'	=> 0
						);
			};

		}
		else
		{
			// Predict
						
			// Where are we now?			
			$query = dbGet("mau_visit",$_REQUEST['id']);
			//echo $query['site'];
			//echo $query['ward'];
			//echo $query['bed'];
			//echo $_REQUEST['destSite'];
			//echo $_REQUEST['destWard'];
			//echo $_REQUEST['destBed'];
			
			if (($query['site']==$_REQUEST['destSite']) && ($query['ward']==$_REQUEST['destWard']) && ($query['bed']==$_REQUEST['destBed']))
			{
				// There is no predicted ward! It's the same as where we are now
			$map = array(
						'dsite'     => 0,
						'dward'  	=> 0,
						'dbed'  	=> 0
						);

			}
			else
			{

			$map = array(
						'dsite'     => $_REQUEST['destSite'],
						'dward'  	=> $_REQUEST['destWard'],
						'dbed'  	=> $_REQUEST['destBed']
						);
						
			};
		};


// Virtual ward round and pathway
// pathway
// nvwr

$map['pathway'] = $_REQUEST['pathway'];
if (isset($_REQUEST['nvwr'])) {
 	$map['nvwrdate'] = $_REQUEST['nvwr'];
};









		dbPut(UPDATE,"mau_visit",$map,$_REQUEST['id']);

		$notemap = array(

	'SBARs' 	=> $_REQUEST['SBARs'],
	'SBARb'		=> $_REQUEST['SBARb'],
	'SBARr' 	=> $_REQUEST['SBARr']

		);
  		dbPut(UPDATE,'mau_data',$notemap,$_REQUEST['nid']);

		if ($_REQUEST['movetype'] === "0") {
			$query = dbGet("mau_visit",$_REQUEST['id']);
			$nQuery = dbGet("mau_patient",$query['patient']);
			$_out=array(
		
		'name'		=>		$__AES->encrypt($nQuery['name'] , $__PW, 256),
		'destination'	=>	$baseSites[$map['site']][1] . ' ' . $baseWards[$map['site']][$map['ward']][0] 
		
		);
			echo json_encode($_out);
		};

		break;
};
case "dbDiscPat":{
		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

//print_r($_REQUEST);

//echo $__AES->decrypt($_REQUEST['gpadv'],$__PW, 256);
//echo $__AES->decrypt($_REQUEST['ccom'],$__PW, 256);

//exit;

		switch ($_REQUEST['disctype']):



			case 1: // Predicted


		$_edd = explode("/",$_REQUEST['add']); // Array as 0-dd 1-mm 2-yyyy



		$map = array(
						'acdd'		=>	sprintf("%s-%s-%s",$_edd[2],$_edd[1],$_edd[0]),
						'status'	=> 	2,
						'ddest'	=>	$_REQUEST['ddest'],
						'dxdone'	=> $_REQUEST['dxdone']
					);

//print_r($map);

		$mapNote = array(
				 	'gpadv'    => $__AES->decrypt($_REQUEST['gpadv'],$__PW, 256),
				 	'patadv'    => $__AES->decrypt($_REQUEST['patadv'],$__PW, 256),
				 	'ccom'    => $__AES->decrypt($_REQUEST['ccom'],$__PW, 256),
				 	'rxchange'	=> $_REQUEST['rxchange'],
				 	'followup'	=> $_REQUEST['followup']
					);

		if ($_REQUEST['nid'] == "") {
			dbPut(INSERT,"mau_data",$mapNote,NULL);
		} else {
			dbPut(UPDATE,"mau_data",$mapNote,$_REQUEST['nid']);
		};


//print_r($mapNote);
			break;
			case 0: // Discharge
				$map = array(
				'dsite'		=>	127,
				'dbed'		=>	0,
				'dward'		=>	0,
				'status'	=>	4
				);
				dbTime("mau_visit",$_REQUEST['id'],"dischdate");	
			break;
			case 2: // RIP
				$map = array(
					'dsite'		=>	127,
					'dbed'		=>	0,
					'dward'		=>	0,
					'status'	=>	3
				);
				dbTime("mau_visit",$_REQUEST['id'],"dischdate");
			break;
		endswitch;
		dbPut(UPDATE,"mau_visit",$map,$_REQUEST['id']);
		break;

// Dates in the m/d/y or d-m-y formats are disambiguated by looking at the separator between the various components: if the separator is a slash (/), then the American m/d/y is assumed; whereas if the separator is a dash (-) or a dot (.), then the European d-m-y format is assumed.
};
case "dbAddVisit":{

//sleep(5);

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW;//  = "trak";
		$__AES  = new AesCtr;


//print_r($_REQUEST);
//exit;

		// UK-formatted date from front-end. Change to ISO 8601
		$splitDate = explode("/",$_REQUEST['dob']); // Array as dd mm yyyy
		$splitDateFormatted = $splitDate[2]."-".$splitDate[1]."-".$splitDate[0];
		$mapPatient = array(
							'pas'     => $_REQUEST['pas'],
					 		'name'    => $__AES->decrypt($_REQUEST['_name'],$__PW, 256),
					 		'dob'     => date('Y-m-d',strtotime($splitDateFormatted)),
					 		'gender'  => $_REQUEST['gender']
					 		);
		$mapVisit 	= array(
					 		'patient' => $_REQUEST['id'],
					 		'status'  => $_REQUEST['reftype'],
							'site'    => $_REQUEST['site'],
					 		'source'  => $_REQUEST['source'],
							'dsite'   => $_REQUEST['destSite'],
							'dward'   => $_REQUEST['destWard'],
							'dbed'    => $_REQUEST['destBed'],
							'ews'     => $_REQUEST['ews'],
							'consoc'  => $_REQUEST['consoc']
					 		);
		if (strtotime(sprintf("%s %s",date('Y-m-d'),$_REQUEST['reg'])) >= time()) {
			$mapVisit['reg'] =  sprintf("%s %s",date("Y-m-d",strtotime("yesterday")),$_REQUEST['reg']);
		} else {
			$mapVisit['reg'] =  sprintf("%s %s",date("Y-m-d"),$_REQUEST['reg']);
		};
	 	if ($_REQUEST['id'] == "0") { // This is a new patient
			dbPut(INSERT,"mau_patient",$mapPatient,NULL);
			$mapVisit['patient'] = mysql_insert_id();
		};
		dbPut(INSERT,"mau_visit",$mapVisit,NULL);
		$_temp_visitID = mysql_insert_id();
		$notemap = array(

	'patient'	=> $mapVisit['patient'],
	'visitid'	=> $_temp_visitID,
	'SBARs' 	=> $_REQUEST['SBARs'],
	'SBARb'		=> $_REQUEST['SBARb'],
	'SBARr' 	=> $_REQUEST['SBARr'],
	'dv'		=> $_REQUEST['dv']
		);
   dbPut(INSERT,'mau_data',$notemap,NULL);
// SBARs SBARb SBARr ews dv
// ,
// 	'bn'		=> $_REQUEST['bn']


$_out=array(

'id'		=>		$mapVisit['patient'],
'status'	=>		$mapVisit['status'],
'name'		=>		$__AES->encrypt($mapPatient['name'] , $__PW, 256)

);
echo json_encode($_out);


		break;
}; //add
case "dbUpdateRef":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;
		
print_r ($_REQUEST);

//formID_ act refid hxid dxid noteHx noteDx ... formUpdateRef

			$map = array(
				'status'      => $_REQUEST['status']
			);
			dbPut(UPDATE,"mau_referral",$map,$_REQUEST['formID_refid']);

			$notemap = array(
				 	'author' 	=>	$_REQUEST['author'],
				 	'bleep'		=>	$_REQUEST['bleep'],
					'note'		=>	$__AES->decrypt($_REQUEST['formID_noteDx'],$__PW, 256),
					'refid'		=>	$_REQUEST['formID_refid'],
					'type'		=>	NOTE_REFDX
					);
			dbPut(UPDATE,"mau_note",$notemap,$_REQUEST['formID_dxid']);


			$notemap = array(
				 	'author' 	=>	$_REQUEST['Hxauthor'],
				 	'bleep'		=>	$_REQUEST['Hxbleep'],
					'note'		=>	$__AES->decrypt($_REQUEST['Hxnote'],$__PW, 256),
					'refid'		=>	$_REQUEST['formID_refid'],
					'type'		=>	NOTE_REFHX
					);
			dbPut(UPDATE,"mau_note",$notemap,$_REQUEST['formID_hxid']);


				if ($_REQUEST['status'] == "4") {
					// Referral is complete, so add time to database
					dbTime("mau_referral",$_REQUEST['formID_refid'],"dtime");
//					dbPutNote(UPDATE,$_REQUEST['formID_noteHx'],$_REQUEST['formID_refid'],$_REQUEST['formID_hxid'],NOTE_REFHX);
//					dbPutNote(UPDATE,$_REQUEST['formID_noteDx'],$_REQUEST['formID_refid'],$_REQUEST['formID_dxid'],NOTE_REFDX);
					if ($_REQUEST['zwho'] == 1) { // Doctor: clear triage
						$triQuery = mysql_query("SELECT triage FROM mau_visit WHERE id=" . $_REQUEST['vid']);
						while ($triResult = mysql_fetch_array($triQuery, MYSQL_ASSOC)) {
							if ($triResult['triage'] == "1" || $triResult['triage'] == "2" || $triResult['triage'] == "3") {
								dbPut(UPDATE,"mau_visit",array('triage' => 0),$_REQUEST['vid']);
							};
						};
					};
					
				};
				if ($_REQUEST['status'] == "2") {
					// Referral is accepted, so add time to database
					dbTime("mau_referral",$_REQUEST['formID_refid'],"stime");
					// Update notes
					// $type,$data,$id,$noteid,$notetype
//					dbPutNote(UPDATE,$_REQUEST['formID_noteHx'],$_REQUEST['formID_refid'],$_REQUEST['formID_hxid'],NOTE_REFHX);
//					dbPutNote(UPDATE,$_REQUEST['formID_noteDx'],$_REQUEST['formID_refid'],$_REQUEST['formID_dxid'],NOTE_REFDX);
				};



break;
}
case "dbAddRef":{

switch (isset($_REQUEST['who']) ? $_REQUEST['who'] : '0'):

case '127':

		$map = array(						 			
			'id'		=>	$_REQUEST['id'], 			
			'visitid'	=>	$_REQUEST['visitid'],		 	
 			'hx'		=>	$_REQUEST['hx'],				
			'req'		=>	$_REQUEST['reqaction'],	
			'due'		=>	date("Y-m-d H:i:s",strtotime(sprintf("%s %s",$_REQUEST['HANcompleteDate'],$_REQUEST['HANcompleteTime']))),
			'expires'	=>	date("Y-m-d H:i:s",strtotime(sprintf("%s %s",$_REQUEST['HANexpireDate'],"10:00:00")))		
		);
		dbPut(INSERT,"mau_han",$map,NULL);

break;
default:

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

//print_r($_REQUEST);

		$map = array(
					'visitid' => $_REQUEST['formID_visitid'],
				 	'who'     => $_REQUEST['formID_who'],
				 	'status'  => $_REQUEST['formID_status'],
				 );
		if ($_REQUEST['formID_id'] == "") {
			dbPut(INSERT,"mau_referral",$map,NULL);
			$refID = mysql_insert_id();
			dbPutNote(INSERT,"",$refID,$_REQUEST['formID_noteid'],NOTE_REFDX);

//			dbPutNote(INSERT,$_REQUEST['formID_note'],$refID,$_REQUEST['formID_noteid'],NOTE_REFHX);
			$notemap = array(
				 	'author' 	=>	$_REQUEST['formID_author'],
				 	'bleep'		=>	$_REQUEST['formID_bleep'],
					'note'		=>	$__AES->decrypt($_REQUEST['formID_note'],$__PW, 256),
					'refid'		=>	$refID,
					'type'		=>	NOTE_REFHX
					);
			dbPut(INSERT,"mau_note",$notemap,NULL);

// $__AES->decrypt($_REQUEST['formID_note'],$__PW, 256)

			dbTime("mau_referral",$refID,"rtime");
//			echo json_encode(array("who" => $_REQUEST['formID_who'], "vid" => $_REQUEST['formID_visitid'], "id" => $refID,"icon" => $baseAuthorRole[$_REQUEST['formID_who']][1]));
		
		} else { // Not used
			dbPut(UPDATE,"mau_referral",$map,$_REQUEST['formID_id']);
			dbPutNote(UPDATE,$_REQUEST['formID_note'],$_REQUEST['formID_id'],$_REQUEST['formID_noteid'],NOTE_REFHX);
			// In case the 'who' is changed in the dialog
//			echo json_encode(array("icon" => $baseAuthorRole[$_REQUEST['formID_who']][1]));
		};


// if ($map['who'] == 1) {
// 			 $jsFooter .= sprintf ('$("#tCount_%s").countdown({serverSync: serverTime, since: new Date(%s,%s,%s,%s,%s,%s),format: "HMS", layout: "➘ {hn}<span id=\'xpoint\'>{sep}</span>{mnn}<span id=\'xpoint\'>{sep}</span>{snn}"});',$map['visitid'],
// 			 		date('Y'),
// 			 		date('m')-1,
// 			 		date('d'),
// 			 		date('G'),
// 			 		intval(date('i')),
// 			 		intval(date('s'))
// 			 		);
// 			 echo '<script type="text/javascript">' . "\n";
// 			 echo $jsFooter;
// 			 echo '</script>';
// 
// 
// };
break;
endswitch; // $_REQUEST['who']
		
		break; // dbAddRef
};
case "dbAddAccept":{
		$map = array(
				 	'visitid' => $_REQUEST['formID_visitid'],
				 	'source'  => $_REQUEST['formID_source'],
				 	'regtime' => $_REQUEST['formID_regtime'],
				 	'pc'      => $_REQUEST['formID_pc'],
				 	'status'  => 1
					);
		$map = array(
				 	'source'  => $_REQUEST['formID_source'],
				 	'status'  => 1
					);
		dbPut(UPDATE,"mau_visit",$map,$_REQUEST['formID_visitid']);
		break;
	};
case "dbAddAdmission":{
		$map = array(
					'ward'    => $_REQUEST['formID_ward'],
					'triage'  => $_REQUEST['formID_triage'],
					'bed'     => $_REQUEST['formID_bed'],
					'status'  => 2
				);
		dbPut(UPDATE,"mau_visit",$map,$_REQUEST['formID_visitid']);
		dbPut(INSERT,"mau_referral",array('visitid' => $_REQUEST['formID_visitid'],'who' => 1, 'status'  => 0),NULL);
		$insertID=mysql_insert_id();
		dbTime("mau_referral",$insertID,"rtime");
		dbPutNote(INSERT,"Automatically generated by admission",$insertID,NULL,NOTE_REFHX);
		dbPut(INSERT,"mau_referral",array('visitid' => $_REQUEST['formID_visitid'],'who' => 2, 'status'  => 0),NULL);
		$insertID=mysql_insert_id();
		dbTime("mau_referral",$insertID,"rtime");
		dbPutNote(INSERT,"Automatically generated by admission",$insertID,NULL,NOTE_REFDX);
		break;
};
case "dbAddNote":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;
		
		$map = array(
				 	'visitid' => $_REQUEST['formID_visitid'],
				 	'refid'   => $_REQUEST['formID_refid'],
				 	'author'  => $_REQUEST['formID_author'],
				 	'bleep	' => $_REQUEST['formID_bleep'],
				 	'role'    => $_REQUEST['formID_role'],
				 	'note'    => $__AES->decrypt($_REQUEST['formID_note'],$__PW, 256)
					);
		if ($_REQUEST['formID_id'] == "") {
			dbPut(INSERT,"mau_note",$map,NULL);
		} else {
			dbPut(UPDATE,"mau_note",$map,$_REQUEST['formID_id']);
		};
		break;

};
case "formAddVisit":{

if (isset($_REQUEST['id'])) {
	$query = dbGet("mau_visit",$_REQUEST['id']);
	$map = array(
				 'id'        => $query['id'],
				 'patient'   => $query['patient'],
				 'site'      => $query['site'],
				 'ward'      => $query['ward'],
				 'bed'       => $query['bed'],
				 'admitdate' => $query['admitdate'],
				 'dischdate' => $query['dischdate'],
				 'status'    => $query['status'],
				 'source'    => $query['source'],
				 'edd'       => $query['edd']
				);
} else {
	$map = array(
				 'id'        => "",
				 'patient'   => $_REQUEST['patient'],
				 'site'      => DEFAULTSITE,
				 'ward'      => "",
				 'bed'       => "",
				 'admitdate' => "",
				 'dischdate' => "",
				 'status'    => "",
				 'source'    => "",
				 'edd'    => ""
				);
};
# Form
tmplHeader();
echo '<form name="input" action="http://'.HOST.'/index.php" method="post">';
formWrite("","hidden","act","dbAddVisit");
formWrite("","hidden","id",$map['id']);
formWrite("","hidden","patient",$map['patient']);
formWriteDrop($baseSites,"Site","site",$map['site']);
# formWrite("Ward","text","ward",$map['ward']);
formWriteDrop($baseWards[$map['site']],"Ward","ward",$map['ward']);
formWrite("Bed","text","bed",$map['bed']);
# formWrite("Admit Date","date","admitdate",$map['admitdate']);
# formWrite("Discharge Date","date","dischdate",$map['dischdate']);
formWriteDrop($baseStatus,"Status","status",$map['status']);
formWriteDrop($baseSource,"Source","source",$map['source']);
formWrite("Estimated Date of Discharge","date","edd",$map['edd']);
echo '<input type="submit" value="Submit" />';
echo '</form>';
//tmplFooter();

break;

};
case "formAddAdmission":{

//	$map = array(
//				 'visitid' => $_REQUEST['visitid'],
//				 'triage'  => $_REQUEST['triage'],
//				 'bed'     => $_REQUEST['bed'],
//				 'ward'    => $_REQUEST['ward'].
//				 'status'  => 2
//				);

echo '<form id="formAddAdmission" action="http://'.HOST.'/index.php" method="post">';
formWrite("","hidden","formID_act","dbAddAdmission");
formWrite("","hidden","formID_visitid",$_REQUEST['vid']);
formWriteDropSimple($baseWards[1],"Ward","formID_ward",0); // Hard coded for site 1 ROH, ward MAU
echo '<br />';
formWrite("Bed","text","formID_bed","");
echo '<br />';
formWriteDropSimple($baseTriage,"Triage","formID_triage",3); // Green
//formWriteTA("Note","formID_note",$map['note'],7,40);
echo '</form><br /><br />';
echo '<div class="tips">All form fields are required.</div>';
echo <<<END
<script type="text/javascript">
 $(function() {
    //$("#dialog" + nextDialogID + " #formAddAdmission").jqTransform();
    var max = 0;
    $("#dialog" + nextDialogID + " #formAddAdmission label").each(function(){
        if ($(this).width() > max)
            max = $(this).width();    
    });
    $("#dialog" + nextDialogID + " #formAddAdmission label").width(max);
});
</script>

END;
//tmplFooter();

break;
};
case "formAddAccept":{

	$query = dbGet("mau_visit",$_REQUEST['vid']);
	$map = array(
				 'source' => $query['source'],	
				);
// visitid regtime pc
echo '<form id="formAddAccept" action="http://'.HOST.'/index.php" method="post">';
formWrite("","hidden","formID_act","dbAddAccept");
formWrite("","hidden","formID_visitid",$_REQUEST['vid']);
formWriteDrop($baseSource,"Source","formID_source",$map['source']); 
echo '<br />';
formWrite("Reg","text","formID_regtime","");
echo '<br />';
formWriteTA("PC","formID_pc","PC",7,40);
echo '</form><br /><br />';
echo '<div class="tips">All form fields are required.</div>';
echo <<<END
<script type="text/javascript">
 $(function() {
    //$("#dialog" + nextDialogID + " #formAddAccept").jqTransform();
    var max = 0;
    $("#dialog" + nextDialogID + " #formAddAccept label").each(function(){
        if ($(this).width() > max)
            max = $(this).width();    
    });
    $("#dialog" + nextDialogID + " #formAddAccept label").width(max);
});
</script>

END;
//tmplFooter();

break;

};
case "formAddNote":{
// id, vid and rid come from add requests.

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;


if (  $_REQUEST['id']  !=  'undefined' ) {
	$query = dbGet("mau_note",$_REQUEST['id']);
	$map = array(
				 'id'      => $query['id'],
				 'visitid' => $query['visitid'],
				 'refid'   => $query['refid'],
				 'author'  => $query['author'],
				 'role'    => $query['role'],
				 'note'    => $__AES->encrypt($query['note'], $__PW, 256),
				 'bleep'    => $query['bleep']
				);
} else {
	$map = array(
				 'id'      => "",
				 'visitid' => isset($_REQUEST['vid']) == TRUE ? $_REQUEST['vid'] : "",
				 'refid'   => isset($_REQUEST['rid']) == TRUE ? $_REQUEST['rid'] : "",
				 'author'  => "",
				 'role'    => "",
				 'note'    => "",
				 'bleep'	=> ""
				);
};
# Form
$vQuery = dbGet("mau_visit",$map['visitid']);
$nQuery = dbGet("mau_patient",$vQuery['patient']);
// tmplHeader();
printf ('<form rel="%s" id="formAddNote" action="http://'.HOST.'/index.php" method="post">',$nQuery['name']);
formWrite("","hidden","act","dbAddNote");
formWrite("","hidden","formID_id",$map['id']);
formWrite("","hidden","formID_visitid",$map['visitid']);
formWrite("","hidden","formID_refid",$map['refid']);


echo '<div style="float:left;width:300px">';

echo '<div style="float:left;">';
echo '<label for="formID_author" class="nLabel">Author</label><br />';
printf ('<input name="formID_author" class="validate[required] ui-button ui-widget ui-corner-all _noteAuthor" type="text" id="formID_author" value="%s"/>',$map['author']);
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="formID_author" class="nLabel">Bleep</label><br />';
printf ('<input name="formID_bleep" class="ui-button ui-widget ui-corner-all _noteBleep" type="text" id="formID_bleep" value="%s"/>',$map['bleep']);
echo "</div>";

echo '<div style="float:left;width:292px;">';
echo '<label class="nLabel">Profession <span id="refWho"></span></label><br />';
echo	'<div class="dialogButtons _refborder" id="refButtons">';
foreach ($baseAuthorRole as $key => $who) {
 if ($key > 120) {continue;};
 printf ('<input %s type="radio" value="%s" id="refDest%s" name="formID_role" class="validate[required,groupRequired[noteProf]]" />',
 $map['role'] == $key ? 'checked="checked"' : "",
 $key,$key);
 printf ('<label for="refDest%s"><img src="gfx/%s" width="38" height="38" rel="%s" /></label>',$key,$who[1],$who[0]);
};
echo	"</div>";
echo "</div>";

echo '</div>'; // float/width300

echo '<div style="float:left">';
printf ('<label for="formID_note" class="nLabel">Note <span id="refDetails">%s</span></label><br />',
	$map['role'] != "" ? "from {$baseAuthorRole[$map['role']][0]}" : '');

echo '<div class="notePaper" style="width:300px;"><div class="_mediumb">';
printf ('<textarea id="formID_note" name="formID_note" class="validate[required] _smallNote">%s</textarea>', $map['note'] );
echo '</div></div>';

echo "</div>";



echo '</form>';


break;
};
case "formUpdateRef":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

// print_r($_REQUEST);

$ref    = dbGet("mau_referral",$_REQUEST['id']);
$noteHx = dbGetNote($_REQUEST['id'],NOTE_REFHX);
$noteDx = dbGetNote($_REQUEST['id'],NOTE_REFDX);
//echo $noteHx['note'];
//echo $noteDx['note'];

$icon = sprintf ('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/%s" /></div>',$baseAuthorRole[$ref['who']][1]);
//printf ('<span class="nLabel">Referral to %s</span>',$baseAuthorRole[$ref['who']][0]);

echo '<form id="formUpdateRef" action="http:/'.HOST.'/index.php" method="post">';
formWrite("","hidden","act","dbUpdateRef");
formWrite("","hidden","formID_refid",$_REQUEST['id']);
formWrite("","hidden","formID_hxid",$noteHx['id']);
formWrite("","hidden","formID_dxid",$noteDx['id']);
formWrite("","hidden","formID_vid",$_REQUEST['vid']);
formWrite("","hidden","zwho",$ref['who']);


$query = dbGet("mau_visit",$_REQUEST['vid']);
echo '<div id="refOutcome">';
//echo '<div style="overflow-y:auto;overflow-x:hidden;height:100%;">'; //new
echo '<div style="float:left;width:300px;margin-right:12px;">';
echo '<div class="nLabel" style="padding-top:6px;">Active diagnosis</div>';
form_listActiveDiagnosis($query['patient']);
echo '<div class="nLabel">Past medical history</div>';
form_listPastMedicalHistory($query['patient']);
echo '<div class="nLabel" style="padding-top:6px;">Referral history</div>';
echo '<div id="_AES_refHx" class="_smallNote" style="padding-top:6px;">';
echo $__AES->encrypt($noteHx['note'], $__PW, 256);
echo '</div>';

echo '<br><div class="_smallNote" style="margin-right:16px;color:green;text-align:right;-webkit-transform: rotate(-5deg); -moz-transform: rotate(-5deg);transform: rotate(-5deg);">';
printf ('Many thanks!<br>%s %s',$noteHx['author'] == '' ? '' : $noteHx['author'], $noteHx['bleep'] == '' ? '' : '(' . $noteHx['bleep'] . ')');
echo '</div>';
//echo '</div>';// new

echo '</div>';

echo '<div style="float:left">';
echo '<div style="float:left;">';
echo '<label for="formID_author" class="nLabel">Assessor\'s name</label><br />';
printf ('<input style="width:248px;" name="formID_author" class="validate[required] ui-button ui-widget ui-corner-all _noteAuthor" type="text" id="formID_author" value="%s"/>',$noteDx['author']);
echo "</div>";
echo '<div style="float:left;">';
echo '<label for="formID_bleep" class="nLabel">Bleep</label><br />';
printf ('<input name="formID_bleep" class="ui-button ui-widget ui-corner-all _noteBleep" type="text" id="formID_bleep" value="%s"/>',$noteDx['bleep']);
echo "</div>";
echo "</div>";

echo '<div style="float:left;">';
printf ('<label for="formID_noteDx" class="nLabel">Advice and recommendations</label><br />');
echo '<div class="notePaper" style="width:300px;"><div class="_mediumb">';
printf ('<textarea id="formID_noteDx" name="formID_noteDx" class="validate[required] _smallNote">%s</textarea>', $__AES->encrypt($noteDx['note'], $__PW, 256)   );
echo '</div></div>';
// echo '<div style="float:left;">';
// echo '<label for="status" class="nLabel">Referral status</label><br />';
// echo	'<div class="dialogButtons" id="statusButtons">';
// foreach ($refStatus as $k => $v) {
// 	$_checked = $ref['status'] & $k;
// 	printf	('<input %svalue="%s" class="validate[required,groupRequired[jobStat]]" type="radio" id="status%s" name="status" /><label for="status%s">%s</label>',
// 				$_checked ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v);
// };
// echo	"</div>";
// echo "</div>";

// Shim:
// Old entries use status == 0 == 1
if ( $ref['status'] == '0' ) { $ref['status'] = '1'; };
printf( '<input type="hidden" data-text="%s" value="%s" id="_patient-status-code" name="patient-status-code" />', $refStatus[$ref['status']], $ref['status']);


echo "</div>";
echo "</div>";
echo '<div id="refInfo" style="display:none;">';



echo '<div style="float:left;">';
echo '<label for="formID_Hxauthor" class="nLabel">Referrer\'s name</label><br />';
printf ('<input style="width:248px;" name="formID_Hxauthor" class="validate[required] ui-button ui-widget ui-corner-all _noteAuthor" type="text" id="formID_Hxauthor" value="%s"/>',$noteHx['author']);
echo "</div>";
echo '<div style="float:left;">';
echo '<label for="formID_Hxbleep" class="nLabel">Bleep</label><br />';
printf ('<input name="formID_Hxbleep" class="ui-button ui-widget ui-corner-all _noteBleep" type="text" id="formID_Hxbleep" value="%s"/>',$noteHx['bleep']);
echo "</div>";
echo '<br style="clear:both;">';
printf ('<label for="formID_refnote" class="nLabel">Original referral note</label><br />');
echo '<div class="notePaper" style="width:300px;"><div class="_mediumb">';
printf ('<textarea id="formID_refnote" name="formID_refnote" class="validate[required] _smallNote">%s</textarea>', '' );
echo '</div></div>';




echo '</div>';
echo '</form>';


echo <<<END
<script type="text/javascript">
 $(function() {
   $('#formID_noteDx').focus();
   $('.ui-dialog-buttonpane').prepend('{$icon}');
   $('#statusButtons').buttonset().css('font-size','12px');
   trak.fn.decode('#_AES_refHx');
	trak.fn.decode('#formID_noteDx');
 });
</script>
END;


break;

};
case "formAddRef":{



switch (isset($_REQUEST['type']) ? $_REQUEST['type'] : NULL):
case 127:{
	$map = array(
				 'id'      => "",
				 'visitid' => isset($_REQUEST['vid']) == TRUE ? $_REQUEST['vid'] : "",
				 'who'     => "",
				 'status'  => "",
				 'rtime'   => "",
				 'dtime'   => "",
				 'note'    => "",
				 'noteid'  => ""
				);
echo '<form id="formAddRef" action="http:/'.HOST.'/index.php" method="post">';
formWrite("","hidden","act","dbAddRef");
formWrite("","hidden","formID_id",$map['id']);
formWrite("","hidden","formID_noteid",$map['noteid']);
formWrite("","hidden","formID_visitid",$map['visitid']);
formWrite("","hidden","formID_status",$map['status']);

// class="validate[required,groupRequired[dateDue]]" formID act id noteid visitid status hx reqaction HANcompleteDate HANcompleteTime edd (expiry 10am)

echo '<div style="float:left;">';
echo '<label for="formID_note" class="nLabel">Summary of history</label><br />';
printf ('<textarea name="formID_hx" class="validate[required] ui-button ui-widget ui-corner-all SBARfieldL" type="text" id="formID_hx" >%s</textarea>',$map['note']);
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="formID_note" class="nLabel">Action required</label><br />';
printf ('<textarea name="formID_reqaction" class="validate[required] ui-button ui-widget ui-corner-all SBARfieldS" type="text" id="formID_reqaction" >%s</textarea>',$map['note']);
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="HANcompleteDate" class="nLabel">Job due…</label><br />';
echo '<div class="dialogButtons">';

//if (date('G') < 10) {

printf		('<input class="HANcompleteDateButton validate[required,groupRequired[dateDue]]" type="radio" value="%s" id="HANcompleteDate1" name="HANcompleteDate" rel="%s" />',
date("Y-m-d"),date("d/m/Y"));
echo 		 '<label for="HANcompleteDate1">Today</label>';

//};

// $os = array("Mac", "NT", "Irix", "Linux");
// if (in_array("Irix", $os)) {
//     echo "Got Irix";
// }
// 1 (for Monday) through 7 (for Sunday)

printf		('<input class="HANcompleteDateButton validate[required,groupRequired[dateDue]]" type="radio" value="%s" id="HANcompleteDate2" name="HANcompleteDate" rel="%s" />',
date("Y-m-d",strtotime("+1 day")),date("d/m/Y",strtotime("+1 day")));
printf 		('<label for="HANcompleteDate2">%s</label>',date("D",strtotime("+1 day")));

// +2 +3 Su M Tu W F
if (in_array(date('N'),array(1,2,3,5,7))) {
printf		('<input class="HANcompleteDateButton validate[required,groupRequired[dateDue]]" type="radio" value="%s" id="HANcompleteDate3" name="HANcompleteDate" rel="%s" />',
date("Y-m-d",strtotime("+2 day")),date("d/m/Y",strtotime("+2 day")));
printf 		('<label for="HANcompleteDate3">%s</label>',date("D",strtotime("+2 day")));

// printf		('<input class="HANcompleteDateButton" type="radio" value="%s" id="HANcompleteDate4" name="HANcompleteDate" rel="%s" />',
// date("Y-m-d",strtotime("+3 day")),date("d/m/Y",strtotime("+3 day")));
// printf 		('<label for="HANcompleteDate4">%s</label>',date("D",strtotime("+3 day")));
};

// next Monday
if (in_array(date('N'),array(4,6))) {
printf		('<input class="HANcompleteDateButton validate[required,groupRequired[dateDue]]" type="radio" value="%s" id="HANcompleteDate5" name="HANcompleteDate" rel="%s" />',
date("Y-m-d",strtotime("next Monday")),date("d/m/Y",strtotime("next Monday")));
printf 		('<label for="HANcompleteDate5">%s</label>',date("D",strtotime("next Monday")));
};

echo '</div>';
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="HANcompleteTime" class="nLabel">…at HH:MM</label><br />';
printf ('<input maxlength="5" style="width:43px;" class="validate[required,custom[trakHANTime]] ui-button ui-widget ui-corner-all" type="text" name="HANcompleteTime" id="HANcompleteTime" value="%s"/>',"");
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="edd" class="nLabel">Job expires at 10 am…</label><br />';
echo '<div class="dialogButtons">';

// Plan
//
// Su		Tomorrow +2 +3
// MTuW		Tomorrow +2 +3
// Th		Tomorrow M
// Sa		Tomorrow M
// F		Tomorrow +2 +3
// 
// < 10:00 today





if (date('G') < 10) {

printf		('<input class="eddButton validate[required,groupRequired[dateExp]]" type="radio" value="%s" id="edd1" name="edd" rel="%s" />',
date("Y-m-d"),date("d/m/Y"));
echo 		 '<label for="edd1">Today</label>';

};

// $os = array("Mac", "NT", "Irix", "Linux");
// if (in_array("Irix", $os)) {
//     echo "Got Irix";
// }
// 1 (for Monday) through 7 (for Sunday)

printf		('<input class="eddButton validate[required,groupRequired[dateExp]]" type="radio" value="%s" id="edd2" name="edd" rel="%s" />',
date("Y-m-d",strtotime("+1 day")),date("d/m/Y",strtotime("+1 day")));
printf 		('<label for="edd2">%s</label>',date("D",strtotime("+1 day")));

// +2 +3 Su M Tu W F
if (in_array(date('N'),array(1,2,3,5,7))) {
printf		('<input class="eddButton validate[required,groupRequired[dateExp]]" type="radio" value="%s" id="edd3" name="edd" rel="%s" />',
date("Y-m-d",strtotime("+2 day")),date("d/m/Y",strtotime("+2 day")));
printf 		('<label for="edd3">%s</label>',date("D",strtotime("+2 day")));

printf		('<input class="eddButton validate[required,groupRequired[dateExp]]" type="radio" value="%s" id="edd4" name="edd" rel="%s" />',
date("Y-m-d",strtotime("+3 day")),date("d/m/Y",strtotime("+3 day")));
printf 		('<label for="edd4">%s</label>',date("D",strtotime("+3 day")));
};

// next Monday
if (in_array(date('N'),array(4,6))) {
printf		('<input class="eddButton validate[required,groupRequired[dateExp]]" type="radio" value="%s" id="edd5" name="edd" rel="%s" />',
date("Y-m-d",strtotime("next Monday")),date("d/m/Y",strtotime("next Monday")));
printf 		('<label for="edd5">%s</label>',date("D",strtotime("next Monday")));
};

echo '</div>';
echo "</div>";


echo '</form>';
$icon = sprintf ('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="42" height="42" src="gfx/%s" /></div><div class="clock"><div id="Date"></div><ul><li id="hours"></li><li id="point">:</li><li id="min"></li><li id="point">:</li><li id="sec"></li></ul></div>',$baseAuthorRole[127][1]);





echo <<<END
<script type="text/javascript">
 $(function() {
   $('.ui-dialog-buttonpane').prepend('{$icon}');

var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]; 
var dayNames= ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

var newDate = new Date();
newDate.setDate(newDate.getDate());
$('#Date').html(dayNames[newDate.getDay()] + " " + newDate.getDate() + ' ' + monthNames[newDate.getMonth()]);
clockSeconds = setInterval( function() {
	var seconds = new Date().getSeconds();
	$("#sec").html(( seconds < 10 ? "0" : "" ) + seconds);
	},1000);
clockMinutes = setInterval( function() {
	var minutes = new Date().getMinutes();
	$("#min").html(( minutes < 10 ? "0" : "" ) + minutes);
    },1000);
clockHours = setInterval( function() {
	var hours = new Date().getHours();
	$("#hours").html(( hours < 10 ? "0" : "" ) + hours);
    }, 1000);

 });
</script>
END;
break; // 127
};
default:{

// This $map stuff is not really needed. New referrals here only, see formUpdateRef to change it
if (isset($_REQUEST['id'])) {
	$query = dbGet("mau_referral",$_REQUEST['id']);
	$map = array(
				 'id'      => $query['id'],
				 'visitid' => $query['visitid'],
				 'who'     => $query['who'],
				 'status'  => $query['status'],
				 'rtime'   => $query['rtime'],
				 'dtime'   => $query['dtime']
				);
	$query = dbGetNote($_REQUEST['id'],NOTE_REFHX);
	$map['note']   = $query['note'];
	$map['noteid'] = $query['id'];
} else {
	$map = array(
				 'id'      => "",
				 'visitid' => isset($_REQUEST['vid']) == TRUE ? $_REQUEST['vid'] : "",
				 'who'     => "",
				 'status'  => "1",
				 'rtime'   => "",
				 'dtime'   => "",
				 'note'    => "",
				 'noteid'  => "",
				 'author'	=> "",
				 'bleep'	=> ""
				);
};

// Creates an array of referrals already made
$_refs = array(); $refQuery = mysql_query("SELECT * FROM mau_referral WHERE visitid = '{$map['visitid']}'");
if (!$refQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		};
while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
	$_refs[]=$_referral['who'];
};

$vQuery = dbGet("mau_visit",$map['visitid']);
$nQuery = dbGet("mau_patient",$vQuery['patient']);
printf ('<form rel="%s" id="formAddRef" action="http:/'.HOST.'/index.php" method="post">',$nQuery['name']);
formWrite("","hidden","act","dbAddRef");
formWrite("","hidden","formID_id",$map['id']);
formWrite("","hidden","formID_noteid",$map['noteid']);
formWrite("","hidden","formID_visitid",$map['visitid']);
formWrite("","hidden","formID_status",$map['status']);

echo '<div style="float:left;width:300px">';

echo '<div style="float:left;">';
echo '<label for="formID_author" class="nLabel">Author/referrer</label><br />';
printf ('<input name="formID_author" class="validate[required] ui-button ui-widget ui-corner-all _noteAuthor" type="text" id="formID_author" value="%s"/>',$map['author']);
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="formID_bleep" class="nLabel">Bleep</label><br />';
printf ('<input name="formID_bleep" class="ui-button ui-widget ui-corner-all _noteBleep" type="text" id="formID_bleep" value="%s"/>',$map['bleep']);
echo "</div>";

echo '<div style="float:left;width:292px;">';
echo '<label class="nLabel">Referral to <span id="refWho"></span></label><br />';
echo	'<div class="dialogButtons _refborder" id="refButtons">';
foreach ($baseAuthorRole as $key => $who) {
 if ($key > 120) {continue;};
 if (in_array($key,$_refs)) {
	$_st = 'style="opacity:0.1;" data-off="1"';
 }
 else
 {
	$_st = '';
 };
 
 printf ('<input %s type="radio" value="%s" id="refDest%s" name="formID_who" class="validate[required,groupRequired[ref]]" />',
 $map['who'] == $key ? 'checked="checked"' : "",
 $key,$key);
 printf ('<label for="refDest%s"><img %s src="gfx/%s" width="38" height="38" rel="%s" /></label>',$key,$_st,$who[1],$who[0]);
};
echo	"</div>";
echo "</div>";

echo '</div>'; // float/width300



// echo '<div style="float:left;">';
// echo '<label for="radio" class="nLabel">Referral to<span id="refWho">...</span></label><br />';
// echo	'<div class="dialogButtons" id="refButtons">';
// foreach ($baseAuthorRole as $key => $who) {
//  if ($key > 120) {continue;};
//  printf ('<input %s class="validate[required,groupRequired[ref]]" type="radio" value="%s" id="refDest%s" name="formID_who" />',
//  $map['who'] == $key ? 'checked="checked"' : "",
//  $key,$key);
//  printf ('<label for="refDest%s"><img src="gfx/%s" width="42" height="42" rel="%s" /></label>',$key,$who[1],$who[0]);
// };
// echo	"</div>";
// echo "</div>";

// echo '<div style="float:left;">';
// echo '<label for="formID_note" class="nLabel">History <span id="refDetails"></span></label><br />';
// printf ('<textarea name="formID_note" class="ui-button ui-widget ui-corner-all REFfield" type="text" id="formID_note" >%s</textarea>',$map['note']);
// echo "</div>";

echo '<div style="float:left">';
printf ('<label for="formID_note" class="nLabel">Referral note <span id="refDetails"></span></label><br />');

echo '<div class="notePaper" style="width:300px;"><div class="_mediumb">';
printf ('<textarea id="formID_note" name="formID_note" class="validate[required] _smallNote">%s</textarea>', $map['note'] );
echo '</div></div>';

echo "</div>";





echo '</form>';

break; // default
};
endswitch;
break;
};
case "formEditPat":{
//sleep(2);
	$query = dbGet("mau_visit",$_REQUEST['vid']);
	$nQuery = dbGet("mau_patient",$query['patient']);
	$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);
//new
	$_scs=array('Ag'=>'','Ai'=>'','Br'=>'','Ci'=>'','Di'=>'','EC'=>'','Fe'=>'');
	if ($notes['scs']!='') {
		$_s = multi_parse_str($notes['scs']);
		foreach($_scs as $key => &$val) {
			$val = $_s['_'.$key][0];
		};
	} else {
		foreach($_scs as $key => &$val) {
			$val = '-1';
		};
	};
//	
if ($query['dsite'] == 0 || $query['dsite'] == "127") {
// No predicted destination (or destination home/today), so use current location
	// $_formMovePatSite = $query['site'];
	// $_formMovePatWard = $query['ward'];
	// $_formMovePatBed  = $query['bed'];

	$_formMovePatSite = $query['site'];
	$_formMovePatWard = $baseDefaultWards[$query['site']];
	$_formMovePatBed  = 0; // Chair


}else
{
// Has predicted destination, so use that
	$_formMovePatSite = $query['dsite'];
	$_formMovePatWard = $query['dward'];
	$_formMovePatBed  = $query['dbed'];

// 				$sql = "SELECT dsite from mau_visit
// 					WHERE site   = $_formMovePatSite
// 					AND   ward   = $_formMovePatWard
// 					AND   bed    = $_formMovePatBed
// 					AND   status = 2
// 					LIMIT 1;";
// 				$bedQuery = mysql_query($sql);
// 				if (mysql_num_rows($bedQuery) != 0) {
// 					$_bedOcc = mysql_fetch_array($bedQuery, MYSQL_ASSOC);
// 					// Predicted bed is occupied
// 					if ($_bedOcc['dsite'] == 127) {
// 						// Patient is predicted to go home today
// 						$bedTrafficLight = 'tl_amber.png';
// 					} else {
// 						$bedTrafficLight = 'tl_red.png';
// 					};
// 				} else {
// 				// Bed is empty
// 					$bedTrafficLight = 'tl_green.png';
// 				};
	};



// 				$sql = "SELECT dsite from mau_visit
// 					WHERE site   = {$query['dsite']}
// 					AND   ward   = {$query['dward']}
// 					AND   bed    = {$query['dbed']}
// 					AND   status = 2
// 					LIMIT 1;";
// 				$bedQuery = mysql_query($sql);
// 				if (mysql_num_rows($bedQuery) != 0) {
// 					$_bedOcc = mysql_fetch_array($bedQuery, MYSQL_ASSOC);
// 					// Predicted bed is occupied
// 					if ($_bedOcc['dsite'] == 127) {
// 						// Patient is predicted to go home today
// 						$bedTrafficLight = 'tl_amber.png';
// 					} else {
// 						$bedTrafficLight = 'tl_red.png';
// 					};
// 				} else {
// 				// Bed is empty
// 					$bedTrafficLight = 'tl_green.png';
// 				};
				
				
				
$bQuery = dbGet("mau_patient",$query['patient']); 
	printf ('<form id="editPat" action="http://'.HOST.'/index.php" method="post">');
	echo '<input type="hidden" name="act" value="dbEditVisit" />';
	printf ('<input type="hidden" name="id" id="id" value="%s" />',$_REQUEST['vid']);
	printf ('<input type="hidden" name="nid" id="nid" value="%s" />',$notes['id']);
	printf ('<input type="hidden" name="pid" id="pid" value="%s" />',$nQuery['id']);
echo '<div style="float:left;width:300px;">';

echo '<div style="float:left;">';
echo '<label for="radio" class="nLabel">Referral Type</label><br />';
echo	'<div class="dialogButtons">';
printf		('<input %s type="radio" value="0" id="patRefType1" name="reftype" /><label for="patRefType1">Predicted</label>',$query['status'] == 0 ? 'checked="checked"' : '');
printf		('<input %s type="radio" value="1" id="patRefType0" name="reftype" /><label for="patRefType0">Referred</label>',$query['status'] == 1 ? 'checked="checked"' : '');
printf		('<input %s type="radio" value="2" id="patRefType2" name="reftype" /><label style="margin-left:6px" for="patRefType2">Admitted</label>',$query['status'] == 2 ? 'checked="checked"' : '');
echo	"</div>";
echo "</div>";

echo '<div id="_dest">';
//echo '<label for="_move" class="nLabel">Destination</label><br />';
//echo '<fieldset name="_move" class="_refborder" style="width:370px">';

// Site
echo '<div style="float:left;margin-top:24px;">';
echo '<label for="destSite" class="nLabel">Destination site</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseSites as $k => $v) {
	printf	('<input data-defaultward="%s" data-defaultward-code="%s" %svalue="%s" type="radio" class="patient-site" id="destSite%s" name="destSite" /><label for="destSite%s">%s</label>',
				$baseWards[$k][$baseDefaultWards[$k]][0],$baseDefaultWards[$k],$_formMovePatSite == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v[1]);
};

echo	"</div>";
echo	"</div>";


// Ward
echo '<div style="float:left;">';
echo '<label for="_destWard" class="nLabel">Ward</label><br />';
printf(	'<div class="_noselect patient-ward" id="_patient-ward">%s</div>', $_formMovePatWard == 0 ? 'Not set' : $baseWards[$_formMovePatSite][$_formMovePatWard][0]	);
printf( '<input type="hidden" value="%s" id="_patient-ward-code" name="patient-ward-code" />', $_formMovePatWard == 0 ? 0 : $_formMovePatWard);
echo '</div>';

// Bed
// echo '<div style="float:left;">';
// echo '<label for="_destWard" class="nLabel">Bed</label><br />';
// printf(	'<div class="_noselect patient-bed" id="_patient-bed">%s</div>', $_formMovePatBed == 0 ? 'Chair' : $_formMovePatBed	);
// printf( '<input type="hidden" value="%s" id="_patient-bed-code" name="patient-bed-code" />', $_formMovePatBed == 0 ? 0 : $_formMovePatBed);
// echo '</div>';

switch ($_formMovePatBed):
	case 0:{
		$_formMovePatBedName = 'Chair';
		break;}
	case 127:{
		$_formMovePatBedName = 'Virtual';
		break;}
	default:{
		$_formMovePatBedName = $_formMovePatBed;
		break;}
endswitch;
echo '<div style="float:left;">';
echo '<label for="_destWard" class="nLabel">Bed</label><br />';
printf(	'<div data-vwr="1" class="_noselect patient-bed" id="_patient-bed">%s</div>', $_formMovePatBedName	);
printf( '<input type="hidden" value="%s" id="_patient-bed-code" name="patient-bed-code" />', $_formMovePatBed);
echo '</div>';


//echo '</fieldset>';


echo '<div style="float:left;margin-top:24px;">';
echo '<label for="triage" class="nLabel">Triage</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseTriage as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s"><span style="color:#%s">&#9679; </span>%s</label>',
				$query['triage'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v[1],$v[0]);};
printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label style="margin-left:6px" for="triage%s">%s</label>',
				$query['triage'] == 0 ? 'checked="checked" ' : "",
				0,0,0,'None');
			
echo	"</div>";
echo	"</div>";

echo '<div style="float:left;margin-top:24px;">';
form_ews($query['ews']);
echo	"</div>";

$_yn = array(0=>"No",1=>"Yes");

echo '<div style="float:left;margin-top:24px;">';
echo '<label for="triage" class="nLabel">Recent D&V?</label><br />';
echo	'<div class="dialogButtons" id="_dv">';
foreach ($_yn as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="dv%s" name="dv" /><label for="dv%s">%s</label>',
				$notes['dv'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";

$_yn = array(0=>"No",1=>"Yes");

echo '<div style="float:left;margin-top:24px;">';
echo '<label for="triage" class="nLabel">Barrier nursing?</label><br />';
echo	'<div class="dialogButtons" id="_bn">';
foreach ($_yn as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="bn%s" name="bn" /><label for="bn%s">%s</label>',
				$notes['bn'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";


echo '</div>';

echo '</div>';

// unused
// echo '<br style="clear:both"/><hr />';
// 
// echo '<div style="float:left;">';
// echo '<label for="destSite" class="nLabel">Destination Site</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($baseSites as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" class="clickSiteB" id="destSite%s" name="destSite" /><label for="destSite%s">%s</label>',
// 				$query['dsite'] == $k ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v[1]);
// };
// echo	"</div>";
// echo	"</div>";		
// $jsFooter = '';		
// echo '<div style="float:left;">';
// echo '<label for="destWard" class="nLabel">Destination Ward</label><br />';
// echo	'<div class="dialogButtons" id="siteWardOptions">';
// foreach ($baseWards[$query['dsite']] as $k => $v) { // Hard coded to '1' ie ROH
// 	printf	('<input %svalue="%s" class="clickWardB" type="radio" id="destWard%s" name="destWard" /><label for="destWard%s">%s</label>',
// 				$query['dward'] == $k ? 'checked="checked" ' : "",	
// 				$k,$k,$k,$v[1]);
// 	if ($query['dward'] == $k)
// 	{
// 		$jsFooter .= "trak.clickRef[{$query['dward']}] = $k;";
// 	};
// };
// echo	"</div>";
// echo	"</div>";
// 
// echo '<div style="float:left;">';
// echo '<label for="destBed" class="nLabel">Waiting area</label><br />';
// echo '<div class="dialogButtons">';
// printf		('<input %s class="clickBedB" type="radio" value="0" id="patBed0" name="nBed" /><label for="patBed0">Chair</label>',$query['dbed'] == 0 ? 'checked="checked"' : '');
// printf		('<input %s class="clickBedB" type="radio" value="1" id="patBed1" name="nBed" /><label for="patBed1">Bed</label>',$query['dbed'] != 0 ? 'checked="checked"' : '');
// echo '</div>';
// echo "</div>";
// 
// echo '<div style="float:left;">';
// echo '<label for="name" class="nLabel">Bed number</label><br />';
// printf ('<input maxlength="2" name="nBedNum" style="width:38px;" class="bedTrafficLightB ui-button ui-widget ui-corner-all" type="text" id="nBedNum" value="%s"/>',$query['dbed']);
// echo '</div>';
// 
// if (isset($bedTrafficLight)) {
// 	echo '<div style="float:left; padding-left:32px;">';
// 	printf ('<img id="trafficlight" src="gfx/%s" width="64" height="64" />',$bedTrafficLight);
// 	echo '</div>';
// } else {
// 	echo '<div style="float:left; padding-left:32px;">';
// 	echo '<img id="trafficlight" src="gfx/tl_amber.png" width="64" height="64" />';
// 	echo '</div>';
// };
// 
// echo '<br style="clear:both"/><hr />';


// echo '<div style="float:left;">';
// echo '<label for="triage" class="nLabel">Manchester triage</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($baseTriage as $k => $v) {
// //	printf	('<input value="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s" style="color:#%s;">%s</label>',
// //				$k,$k,$k,$v[1],$v[0]);
// 	printf	('<input class="validate[required,groupRequired[mantriage]]" %svalue="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s"><span style="color:#%s">%s</span></label>',
// 				$query['triage'] == $k ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v[1],$v[0]);};
// echo	"</div>";
// echo	"</div>";

// echo '<div style="float:left;">';
// echo '<label for="ews" class="nLabel">EWS</label><br />';
// printf ('<input value="%s" maxlength="1" name="ews" style="width:16px;" class="validate[required,custom[trakEWS]] ui-button ui-widget ui-corner-all" type="text" id="ews" />',$query['ews']);
// echo '</div>';

echo '<div style="float:left;">';
foreach ($scs as $k => $v) {
printf ('<div style="display:none;" id="id_%s">',$k);
$_loop = 0;
foreach ($v as $x) {
	$_vars = explode(':',$x);
	if (!isset($_vars[2])) {
		printf ('<div class="_scsButton" data-type="%s" data-value="%s" data-choice="%s">',$k,$_vars[0],$_loop);
		printf ('%s',$_vars[1]);
		echo '</div>';
	}
	else
	{
		if (years_old($nQuery['dob']) >= $_vars[2]) {
			printf ('<div class="_scsButton" data-type="%s" data-value="%s" data-choice="%s">',$k,$_vars[0],$_loop);
			printf ('%s',$_vars[1]);
			echo '</div>';		
		}
	};
$_loop++;
};
printf ('<div style="margin-top:4px;" class="_scsButton" data-type="%s" data-value="%s" data-choice="-1">',$k,0);
printf ('%s','Not set');
echo '</div>';
echo '</div>';
};
printf( '<div style="clear:both;"><label for="_flow" class="nLabel">Simple clinical score</label><br />');
echo '<fieldset id="_scsform" class="_refborder" style="width:280px;">';
echo '<div style="float:right;" id="_scs"></div>';	
$_ageScore=0;
if (years_old($nQuery['dob']) > 75) {
	$_ageScore=4;
};
if (years_old($nQuery['dob']) <= 75) {
	if ($nQuery['gender'] == '1') {
		// Male
		if (years_old($nQuery['dob']) >=50) {
			$_ageScore=2;	
		};
	}
	else
	{
		// Female
		if (years_old($nQuery['dob']) >=55) {
			$_ageScore=2;		
		};
	};
};
printf ('<div style="display:none;" data-set="%s" class="_scsButtonSelected" id="scsDefault_Age"></div>',$_ageScore);
//new
printf ('<input type="hidden" name="_Ag" value="%s">',$_ageScore);
//
foreach ($scs as $k => $v) {
echo '<div>';
printf( '<label for="label_%s" class="nLabel">%s</label><br />',$k,$k);
//new
if ($_scs[substr($k,0,2)]=='-1') {
	$_desc='Not set';
	$_dval='0';
} else {
	$_temp = explode(':',$scs[$k][$_scs[substr($k,0,2)]]);
	$_desc = $_temp[1];
	$_dval = $_temp[0];
};
printf ('<div data-type="%s" data-set="%s" class="_scsButtonSelected" id="scsDefault_%s">%s</div>',$k,$_dval,$k,$_desc);
printf ('<input type="hidden" name="_%s" value="%s">',substr($k,0,2),$_scs[substr($k,0,2)]);
//
echo '</div>';

};
echo '</fieldset></div>';
echo	"</div>";



echo <<<HTML
			
            </div>
        </div>
</div>
</form>
HTML;

//	 $('.ui-dialog-buttonpane').prepend('{$icon}');







//	echo '</form>';

break; // formEditPat
};
case "formMovePat":{
//sleep(2);
	$query  = dbGet("mau_visit",$_REQUEST['vid']);
	$nQuery = dbGet("mau_patient",$query['patient']);

if ($query['dsite'] == 0 || $query['dsite'] == "127") {
// No predicted destination (or destination home/today), so use current location
	$_formMovePatSite = $query['site'];
	$_formMovePatWard = $query['ward'];
	$_formMovePatBed  = $query['bed'];
}else
{
// Has predicted destination, so use that
	$_formMovePatSite = $query['dsite'];
	$_formMovePatWard = $query['dward'];
	$_formMovePatBed  = $query['dbed'];

				$sql = "SELECT dsite from mau_visit
					WHERE site   = $_formMovePatSite
					AND   ward   = $_formMovePatWard
					AND   bed    = $_formMovePatBed
					AND   status = 2
					LIMIT 1;";
				$bedQuery = mysql_query($sql);
				if (mysql_num_rows($bedQuery) != 0) {
					$_bedOcc = mysql_fetch_array($bedQuery, MYSQL_ASSOC);
					// Predicted bed is occupied
					if ($_bedOcc['dsite'] == 127) {
						// Patient is predicted to go home today
						$bedTrafficLight = 'tl_amber.png';
					} else {
						$bedTrafficLight = 'tl_red.png';
					};
				} else {
				// Bed is empty
					$bedTrafficLight = 'tl_green.png';
				};
	};

	printf ('<form rel="%s" id="movePat" action="http://'.HOST.'/index.php" method="post">',$nQuery['name']);
//printf ('<form data-visitid="%s" id="movePat" action="http://'.HOST.'/index.php" method="post">',$_REQUEST['vid']);
	echo '<input type="hidden" name="act" value="dbEditVisit" />';
	printf ('<input type="hidden" name="id" id="id" value="%s" />',$_REQUEST['vid']);

echo '<div style="float:left;">';
echo '<label for="destSite" class="nLabel">Destination Site</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseSites as $k => $v) {
	printf	('<input %svalue="%s" type="radio" class="clickSiteC" id="destSite%s" name="destSite" /><label for="destSite%s">%s</label>',
				$_formMovePatSite == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v[1]);
};

$jsFooter='';

echo	"</div>";
echo	"</div>";		
		
echo '<div style="float:left;">';
echo '<label for="destWard" class="nLabel">Destination Ward</label><br />';
echo	'<div class="dialogButtons" id="siteWardOptions">';
foreach ($baseWards[$_formMovePatSite] as $k => $v) { // Hard coded to '1' ie ROH
	printf	('<input class="clickWardC" %svalue="%s" type="radio" id="destWard%s" name="destWard" /><label for="destWard%s">%s</label>',
				$_formMovePatWard == $k ? 'checked="checked" ' : "",	
				$k,$k,$k,$v[1]);
	if ($_formMovePatWard == $k)
	{
		$jsFooter .= "trak.clickRef[$_formMovePatWard] = $k;";
	};
};
echo	"</div>";
echo	"</div>";

echo '<div style="float:left;">';
echo '<label for="destBed" class="nLabel">Location</label><br />';
echo '<div class="dialogButtons">';
printf		('<input %s class="clickBedC" type="radio" value="0" id="patBed0" name="nBed" /><label for="patBed0">Chair</label>',$_formMovePatBed == 0 ? 'checked="checked"' : '');
printf		('<input %s class="clickBedC" type="radio" value="127" id="patBed127" name="nBed" /><label for="patBed127">Virtual</label>',$_formMovePatBed == 127 ? 'checked="checked"' : '');
printf		('<input %s class="clickBedC" type="radio" value="1" id="patBed1" name="nBed" /><label for="patBed1">Bed</label>', ($_formMovePatBed != 0 && $_formMovePatBed != 127) ? 'checked="checked"' : '');
echo '</div>';
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="name" class="nLabel">Bed number</label><br />';
printf ('<input maxlength="2" name="nBedNum" style="width:38px;" class="bedTrafficLight ui-button ui-widget ui-corner-all" type="text" id="nBedNum" value="%s"/>',$_formMovePatBed);
echo '</div>';

if (isset($bedTrafficLight)) {
	echo '<div style="float:left; padding-left:4px;padding-top:14px;">';
	printf ('<img id="trafficlight" src="gfx/%s" width="48" height="48" />',$bedTrafficLight);
	echo '</div>';
} else {
	echo '<div style="float:left; padding-left:4px;padding-top:14px;">';
	echo '<img id="trafficlight" src="gfx/tl_amber.png" width="48" height="48" />';
	echo '</div>';
};

	echo '</form>';
echo <<<END
<script type="text/javascript">
 $jsFooter
</script>

END;

break; // formMovePat
};
case "formMovePatNew":{
//sleep(2);
	$query  = dbGet("mau_visit",$_REQUEST['vid']);
	$nQuery = dbGet("mau_patient",$query['patient']);
	$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);

if ($query['dsite'] == 0 || $query['dsite'] == "127") {
// No predicted destination (or destination home/today), so use current location
	$_formMovePatSite = $query['site'];
	$_formMovePatWard = $query['ward'];
	$_formMovePatBed  = $query['bed'];
}else
{
// Has predicted destination, so use that
	$_formMovePatSite = $query['dsite'];
	$_formMovePatWard = $query['dward'];
	$_formMovePatBed  = $query['dbed'];

				$sql = "SELECT dsite from mau_visit
					WHERE site   = $_formMovePatSite
					AND   ward   = $_formMovePatWard
					AND   bed    = $_formMovePatBed
					AND   status = 2
					LIMIT 1;";
				$bedQuery = mysql_query($sql);
				if (mysql_num_rows($bedQuery) != 0) {
					$_bedOcc = mysql_fetch_array($bedQuery, MYSQL_ASSOC);
					// Predicted bed is occupied
					if ($_bedOcc['dsite'] == 127) {
						// Patient is predicted to go home today
						$bedTrafficLight = 'tl_amber.png';
					} else {
						$bedTrafficLight = 'tl_red.png';
					};
				} else {
				// Bed is empty
					$bedTrafficLight = 'tl_green.png';
				};
	};

	printf ('<form id="movePat" action="http://'.HOST.'/index.php" method="post">');
	echo '<input type="hidden" name="act" value="dbEditVisit" />';
	printf ('<input type="hidden" name="id" id="id" value="%s" />',$_REQUEST['vid']);
	printf ('<input type="hidden" name="nid" id="nid" value="%s" />',$notes['id']);
	
echo '<div id="_dest">';
echo '<label for="_move" class="nLabel">Destination</label><br />';
echo '<fieldset name="_move" class="_refborder" style="width:310px">';

// Site
echo '<div style="float:left;">';
echo '<label for="destSite" class="nLabel">Site</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseSites as $k => $v) {
	printf	('<input data-defaultward="%s" data-defaultward-code="%s" %svalue="%s" type="radio" class="patient-site" id="destSite%s" name="destSite" /><label for="destSite%s">%s</label>',
				$baseWards[$k][$baseDefaultWards[$k]][0],$baseDefaultWards[$k],$_formMovePatSite == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v[1]);
};

echo	"</div>";
echo	"</div>";
echo '<br style="clear:both;">';
// Ward
echo '<div style="float:left;">';
echo '<label for="_destWard" class="nLabel">Ward</label><br />';
printf(	'<div class="_noselect patient-ward" id="_patient-ward">%s</div>', $_formMovePatWard == 0 ? 'Not set' : $baseWards[$_formMovePatSite][$_formMovePatWard][0]	);
printf( '<input type="hidden" value="%s" id="_patient-ward-code" name="patient-ward-code" />', $_formMovePatWard == 0 ? 0 : $_formMovePatWard);
echo '</div>';

// Bed

switch ($_formMovePatBed):
	case 0:{
		$_formMovePatBedName = 'Chair';
		break;}
	case 127:{
		$_formMovePatBedName = 'Virtual';
		break;}
	default:{
		$_formMovePatBedName = $_formMovePatBed;
		break;}
endswitch;
echo '<div style="float:left;">';
echo '<label for="_destWard" class="nLabel">Bed</label><br />';
printf(	'<div data-vwr="1" class="_noselect patient-bed" id="_patient-bed">%s</div>', $_formMovePatBedName	);

//echo '<input type="checkbox" id="_avail" /><label for="_avail">✔</label>';
printf( '<input type="hidden" value="%s" id="_patient-bed-code" name="patient-bed-code" />', $_formMovePatBed);
echo '</div>';

echo '</fieldset>';


echo '<label for="_ambu" class="nLabel">Ambulatory care</label><br />';
echo '<fieldset name="_ambu" class="_refborder" style="width:310px">';

//Next virtual ward round?
echo '<div style="float:left;">';
echo '<label for="edd" class="nLabel">Next virtual ward round</label><br />';
echo '<div class="dialogButtons">';
$_loop = 1;$_numb = 0;
while ($_numb < 5) {


$_date = date("Y-m-d",strtotime("+".$_loop." day"));

if (in_array(date('N',strtotime($_date)),array(6,7))) {

	$_loop++;

}
else
{
//	echo $_date;
//	echo "<br>";


printf		('<input type="radio" value="%s" id="nvwr%s" name="nvwr" %s/>',
date("Y-m-d",strtotime($_date)), $_loop, $query['nvwrdate'] == $_date ? 'checked="checked" ' : '' );
printf 		('<label for="nvwr%s">%s</label>',$_loop, date("D",strtotime($_date)));


	$_numb++;
	$_loop++;


};







};
echo '</div>';

//Pathway
echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Ambulatory pathway</label><br />';
printf(	'<div class="_noselect patient-pathway" id="_patient-pathway">%s</div>', $query['pathway'] == 0 ? 'Inpatient' : $basePathway[$query['pathway']][0]	);
//printf(	'<div class="_noselect pathway-doc" id="_pathway-doc" data-url="%s">&nbsp;</div>', $query['pathway'] == 0 ? '' : $basePathway[$query['pathway']][1]	);
printf( '<input type="hidden" value="%s" id="_patient-pathway-code" name="patient-pathway-code" />', $query['pathway'] == 0 ? '0' : $query['pathway']);
echo '</div>';


echo '</fieldset>';




echo '</div>';
echo "</div>";



























echo '</div>';

echo '<div id="_sbar" style="display:none;">';
echo '<label for="_handover" class="nLabel">Handover</label><br />';
echo '<fieldset name="_handover" class="_refborder" style="width:310px">';
echo '<div style="float:left;">';
echo '<label for="SBARs" class="nLabel">S: Presenting complaint</label><br />';
printf ('<textarea name="SBARs" class="ui-state-default ui-widget ui-corner-all SBARfield" type="text" id="SBARs">%s',$notes['SBARs']);
echo "</textarea></div>";

echo '<div style="float:left;">';
echo '<label for="SBARb" class="nLabel">B: Summary of recent medical history</label><br />';
printf ('<textarea name="SBARb" class="ui-state-default ui-widget ui-corner-all SBARfield" type="text" id="SBARb">%s',$notes['SBARb']);
echo "</textarea></div>";

echo '<div style="float:left;">';
echo '<label for="SBARr" class="nLabel">A: Working diagnosis</label><br />';
printf ('<textarea name="SBARr" class="ui-state-default ui-widget ui-corner-all SBARfield" type="text" id="SBARr">%s',$notes['SBARr']);
echo "</textarea></div>";
echo '</fieldset>';
echo '</div>';


// Required js admin
$jsFooter='';
$jsFooter .= "trak.clickRef[$_formMovePatSite] = '{$baseWards[$_formMovePatSite][$_formMovePatWard][0]}';";
$jsFooter .= "trak.clickRefCode[$_formMovePatSite] = $_formMovePatWard;";
$jsFooter .= "trak.clickRefBed['b{$_formMovePatSite}_{$_formMovePatWard}'] = $_formMovePatBed;";



	echo '</form>';
echo <<<END
<script type="text/javascript">
 $jsFooter
</script>

END;

break; // formMovePatNew
};
case "formDiscPat":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

	$query = dbGet("mau_visit",$_REQUEST['vid']);
	$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);

	printf ('<form id="discPat" action="http://'.HOST.'/index.php" method="post">');
	echo '<input type="hidden" name="act" value="dbDiscVisit" />';
	printf ('<input type="hidden" name="id" id="id" value="%s" />',$_REQUEST['vid']);
	formWrite("","hidden","nid",$notes['id']);
	formWrite("","hidden","dxdone",$query['dxdone']);

if ($query['acdd'] == "0000-00-00") {

	if ($query['edd'] == "0000-00-00") {	
 		$query['acdd'] = date("Y-m-d");
 	}
 	else
 	{
 		$query['acdd'] = $query['edd'];
 	};

};

echo '<div style="float:left;width:310px;">';

//Discharge
echo '<div style="float:left;">';
echo '<label for="edd" class="nLabel">Date of Discharge</label><br />';
echo '<div class="dialogButtons">';

printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd3" name="edd" rel="%s" />',
$query['acdd'] == date("Y-m-d",strtotime("-1 day")) ? 'checked="checked" ':"",date("Y-m-d",strtotime("-1 day")),date("d/m/Y",strtotime("-1 day")));
printf 		('<label for="edd3">%s</label>',date("D",strtotime("-1 day")));

printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd1" name="edd" rel="%s" />',
$query['acdd'] == date("Y-m-d") ? 'checked="checked" ':""        ,date("Y-m-d"),date("d/m/Y"));
echo 		 '<label for="edd1">Today</label>';

printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd2" name="edd" rel="%s" />',
$query['acdd'] == date("Y-m-d",strtotime("+1 day")) ? 'checked="checked" ':"",date("Y-m-d",strtotime("+1 day")),date("d/m/Y",strtotime("+1 day")));
printf 		('<label for="edd2">%s</label>',date("D",strtotime("+1 day")));

echo '</div>';
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="eddd" class="nLabel">&nbsp;</label><br />';
@printf ('<input name="eddd" style="width:100px;" class="validate[required,custom[trakEDD]] eddDate ui-button ui-widget ui-corner-all" type="text" id="eddd" value="%s"/>',$query['acdd'] == (string) "0000-00-00" ? "" : date("d/m/Y",strtotime($query['acdd'])));
echo "</div>";

//Clinical com
echo '<div style="float:left;">';
echo '<label for="ccom" class="nLabel">Clinical commentary</label><br />';
echo '<div class="notePaper" style="float:left;width:300px;"><div class="_mediumc">'; //mediumb
printf ('<textarea class="_smallNote" name="ccom" type="text" id="ccom" >%s</textarea>',$__AES->encrypt($notes['ccom'] , $__PW, 256) );
echo '</div></div></div>';




//FU
//echo '<div style="float:left;width:290px;">';
echo '<div style="float:left;">';
echo '<label for="_fuButton" class="nLabel">Follow-up</label><br />';
printf(	'<div class="_noselect patient-followup" id="_patient-followup">%s</div>',  $notes['followup'] == 0 ? 'Not set' :  $followupTypes[$notes['followup']]	);
printf( '<input type="hidden" value="%s" id="_patient-followup-code" name="patient-followup-code" />', $notes['followup']);
echo '</div>';

echo '</div>';

//echo '<div style="float:left;width:310px;">';



//echo '</div>';

echo '<div style="float:left;width:310px;">';

//GPAdv
echo '<div style="float:left;">';
echo '<label for="gpadv" class="nLabel">Advice to General Practitioner</label><br />';
echo '<div class="notePaper" style="float:left;width:300px;"><div class="_smallerb">';
printf ('<textarea class="_smallNote" name="gpadv" type="text" id="gpadv" >%s</textarea>',$__AES->encrypt($notes['gpadv'] , $__PW, 256) );
echo '</div></div></div>';

//AdvPat
echo '<div style="float:left;">';
echo '<label for="patadv" class="nLabel">Advice to patient</label><br />';
echo '<div class="notePaper" style="float:left;width:300px;"><div class="_smallerb">';
printf ('<textarea class="_smallNote" name="patadv" type="text" id="patadv" >%s</textarea>',$__AES->encrypt($notes['patadv'] , $__PW, 256) );
echo '</div></div></div>';

//RxC
echo '<div style="float:left;">';
echo '<label for="rxchange" class="nLabel">Rx changes?</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseRxChange as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="rxchange%s" name="rxchange" /><label for="rxchange%s">%s</label>',
				$notes['rxchange'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";


//Dest
//echo '<div style="float:left;width:290px;">';
echo '<div style="float:left;">';
echo '<label for="_ddButton" class="nLabel">Destination</label><br />';
printf(	'<div class="_noselect patient-dischargedestination" id="_patient-dischargedestination">%s</div>',  $query['ddest'] == 0 ? 'Not set' :  $dischargeDest[$query['ddest']]	);
printf( '<input type="hidden" value="%s" id="_patient-dischargedestination-code" name="patient-dischargedestination-code" />', $query['ddest']);
echo '</div>';




echo '</div>';
		


	echo '</form>';
printf('<div style="display:none;"><div id="_print-gp" data-description="Discharge summary" data-visitid="%s" data-type="2" class="hdrWideButtons5"></div>
<div id="_print-pat" data-description="Patient-held admission information" data-visitid="%s" data-type="4" class="hdrWideButtons5"></div></div>
',$_REQUEST['vid'],$_REQUEST['vid']);

break; // formDiscPat
};
case "formAddPat":{
//sleep(3);
	echo '<form id="addPat" action="http://'.HOST.'/index.php" method="post">';
	
// 	echo '<div id="tabs" style="height:395px;">';
// 	echo '<ul>';
// 		echo '<li><a href="#tabs-1" style="font-size:12pt;">Demographics</a></li>';
// 		echo '<li><a href="#tabs-2" style="font-size:12pt;">SBAR</a></li>';
// 		echo '<li><a href="#tabs-3" style="font-size:12pt;">Destination</a></li>';
// 	echo '</ul>';


//Reveal
//echo '<div id="reveal">';
//echo '<div class="slides">';
//echo '<section>';


	echo '<div id="info">';

	echo '<input type="hidden" name="act" value="dbAddVisit" />';
	echo '<input type="hidden" name="id" id="id" value="0" />';
	printf('<input type="hidden" name="site" id="site" value="%s" />',$_REQUEST['addSite']);

echo '<div style="float:left;">'; // float_1

echo '<fieldset class="_refborder" style="width:318px;">';
echo '<div style="float:left;">';
echo '<label for="pas" class="nLabel">Hospital number<br /></label>';
	printf ('<input data-prompt-position="topLeft" name="pas" style="width:155px;" maxlength="8" class=" ui-button ui-widget ui-corner-all validate[required,custom[trakPAS]]" type="text" id="pas" value="%s"/>',"");
	echo '<a class="_noselect" style="margin-left:4px;" id="patSearch">Search</a>';
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="name" class="nLabel">Patient\'s name</label><br />';
printf ('<input data-prompt-position="topLeft" name="name" style="width:268px;" class="ui-button ui-widget ui-corner-all validate[required,custom[trakName]]" type="text" id="name" value="%s"/>',"");
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="dob" class="nLabel">Date of Birth</label><br />';
printf ('<input data-prompt-position="topLeft" name="dob" style="width:100px;" class="patDob ui-button ui-widget ui-corner-all validate[required,custom[trakDOB]] datepicker" type="text" id="dob" value="%s"/>',"");
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="gender" class="nLabel">Gender</label><br />';
echo	'<div class="dialogButtons">';
echo		'<input class="validate[required,groupRequired[gender]]" type="radio" value="1" id="patSex1" name="gender" /><label for="patSex1">Male</label>';
echo		'<input class="validate[required,groupRequired[gender]]" type="radio" value="0" id="patSex0" name="gender" /><label for="patSex0">Female</label>';
echo	"</div>";
echo "</div>";
echo "</fieldset>";
echo '<fieldset id="_type" class="_refborder" style="width:318px;margin-top:4px;">';
echo '<div style="float:left;">';
echo '<label for="radio" class="nLabel">Referral Source</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseSource as $k => $v) {
	printf	('<input class="validate[required,groupRequired[refsource]]" value="%s" type="radio" id="sourceRadio%s" name="source" /><label for="sourceRadio%s">%s</label>',
				$k,$k,$k,$v[2]);
};
echo	"</div>";
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="patReg" class="nLabel">Arrived @</label><br />';
printf ('<input maxlength="5" style="width:38px;" class="ui-button ui-widget ui-corner-all" type="text" name="patReg" id="patReg" value="%s"/>',"");
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="radio" class="nLabel">Referral Type</label><br />';
echo	'<div class="dialogButtons">';
echo		'<input class="validate[required,groupRequired[reftype]]" type="radio" value="0" id="patRefType1" name="reftype" /><label for="patRefType1">Predicted</label>';
echo		'<input class="validate[required,groupRequired[reftype]]" type="radio" value="1" id="patRefType0" name="reftype" /><label for="patRefType0">Accepted</label>';
echo	"</div>";
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Consultant</label><br />';

	$conQuery = mysql_query(sprintf("SELECT consoc FROM `mau_visit` WHERE site = '%s' ORDER by id DESC LIMIT 1",$_REQUEST['addSite']));
	if (!$conQuery) {
   		echo 'Could not run query: ' . mysql_error();
   		exit;
	};
	if (mysql_num_rows($conQuery) != 0) {
		$_conRow = mysql_fetch_array($conQuery, MYSQL_ASSOC);
		$_con = $_conRow['consoc'] != 0 ? $_conRow['consoc'] : 1;
	}
	else
	{
		$_con = 1;
	};
	
	
printf(	'<div class="_noselect patient-consultants-oc" id="_patient-consultants-oc">%s</div>', $consultantsOncall[$_REQUEST['addSite']][$_con]	);
printf( '<input type="hidden" value="%s" id="_patient-consultants-oc-code" name="patient-consultants-oc-code" />',$_con);

echo "</div>";
echo "</fieldset>";

echo '</div>'; // end:float_1










echo '<div style="margin-left:8px;width:312px;float:left;">';
echo '<div style="float:left">';


echo '<div style="float:left;">';
echo '<label for="SBARs" class="nLabel">S: Presenting complaint</label><br />';
printf ('<textarea name="SBARs" class="ui-state-default ui-widget ui-corner-all SBARfield" type="text" id="SBARs" value="%s">',"");
echo "</textarea></div>";

echo '<div style="float:left;">';
echo '<label for="SBARb" class="nLabel">B: Summary of recent medical history</label><br />';
printf ('<textarea name="SBARb" class="ui-state-default ui-widget ui-corner-all SBARfield" type="text" id="SBARb" value="%s">',"");
echo "</textarea></div>";

// echo '<div style="float:left;">';
// echo '<label for="SBARa" class="nLabel">Assessment</label><br />';
// printf ('<textarea name="SBARa" class="ui-button ui-widget ui-corner-all SBARfield" type="text" id="SBARa" value="%s">',"");
// echo "</textarea></div>";

echo '<div style="float:left;">';
echo '<label for="SBARr" class="nLabel">A: Working diagnosis</label><br />';
printf ('<textarea name="SBARr" class="ui-state-default ui-widget ui-corner-all SBARfield" type="text" id="SBARr" value="%s"/>',"");
echo "</textarea></div>";

echo '</div>';
echo '<div style="float:left">';
// echo '<div style="float:left;">';
// echo '<label for="radio" class="nLabel">Early Warning Score</label><br />';
// echo	'<div class="dialogButtons" id="_ews">';
// for($loop=0;$loop<=5;$loop++) {
// 	printf	('<input %svalue="%s" type="radio" id="ewsRadio%s" name="ews" /><label for="ewsRadio%s">%s</label>',
// 				0 == $loop ? 'checked="checked" ' : "",
// 				$loop,$loop,$loop,$loop);
// };
// echo	"</div>";
// echo	"</div>";

form_ews(0);

$_yn = array(0=>"No",1=>"Yes");

echo '<div style="float:left;">';
echo '<label for="triage" class="nLabel">Recent D&V?</label><br />';
echo	'<div class="dialogButtons" id="_dv">';
foreach ($_yn as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="dv%s" name="dv" /><label for="dv%s">%s</label>',
				0 == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";

// echo '<div style="float:left;">';
// echo '<label for="bnn" class="nLabel">Barrier nursing?</label><br />';
// echo	'<div class="dialogButtons" id="_bn">';
// foreach ($_yn as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" id="bn%s" name="bn" /><label for="bn%s">%s</label>',
// 				0 == $k ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v);};
// echo	"</div>";
// echo	"</div>";

$_formMovePatSite = $_REQUEST['addSite'];
$_formMovePatWard = $baseDefaultWards[$_REQUEST['addSite']];
$_formMovePatBed = 0;


// Ward
echo '<div style="float:left;">';
echo '<label for="_destWard" class="nLabel">Ward</label><br />';
printf(	'<div class="_noselect patient-ward" id="_patient-ward" data-short="1">%s</div>', $_formMovePatWard == 0 ? 'Not set' : $baseWards[$_formMovePatSite][$_formMovePatWard][1]	);
printf( '<input type="hidden" value="%s" id="_patient-ward-code" name="patient-ward-code" />', $_formMovePatWard);

// Terrible hack to make the existing site/ward/bed code work
printf( '<input style="display:none;" checked="checked" type="radio" value="%s" id="_patient-site-code" name="destSite" />', $_REQUEST['addSite']);



echo '</div>';

// Bed

switch ($_formMovePatBed):
	case 0:{
		$_formMovePatBedName = 'Chair';
		break;}
	case 127:{
		$_formMovePatBedName = 'Virtual';
		break;}
	default:{
		$_formMovePatBedName = $_formMovePatBed;
		break;}
endswitch;
echo '<div style="float:left;">';
echo '<label for="_destWard" class="nLabel">Bed</label><br />';
printf(	'<div data-vwr="1" class="_noselect patient-bed" id="_patient-bed">%s</div>', $_formMovePatBedName	);
printf( '<input type="hidden" value="%s" id="_patient-bed-code" name="patient-bed-code" />', $_formMovePatBed);
echo '</div>';







echo '</div>';
echo '</div>';










	
	echo '</div>'; // info


// $jsFooter = '';
// 
// echo <<<HTML
// <div id="demo">
// 
// </div>
// HTML;
// 
// 		echo '<div id="dest" style="display:none;">';
// 
// echo '<div style="float:left;">';
// echo '<label for="destSite" class="nLabel">Destination Site</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($baseSites as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" class="clickSite" id="destSite%s" name="destSite" /><label for="destSite%s">%s</label>',
// 				$_REQUEST['addSite'] == $k ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v[1]);
// 	// $jsFooter .= "trak.clickRef[$k]=new Array();";
// };
// echo	"</div>";
// echo	"</div>";		
// 		
// echo '<div style="float:left;">';
// echo '<label for="destWard" class="nLabel">Destination Ward</label><br />';
// echo	'<div class="dialogButtons" id="siteWardOptions">';
// foreach ($baseWards[$_REQUEST['addSite']] as $k => $v) { // Was hard coded to '1' ie ROH
// 	printf	('<input %svalue="%s" class="clickWard" type="radio" id="destWard%s" name="destWard" /><label for="destWard%s">%s</label>',
// 				DEFAULTWARD == $k ? 'checked="checked" ' : "",	
// 				$k,$k,$k,$v[1]);
// 	if (DEFAULTWARD == $k)
// 	{
// 		$jsFooter .= "trak.clickRef[{$_REQUEST['addSite']}] = $k;";
// 	};
// };
// echo	"</div>";
// 
// 
// echo	"</div>";
// 
// echo '<div style="float:left;">';
// echo '<label for="destBed" class="nLabel">Waiting area</label><br />';
// // printf ('<input maxlength="2" style="width:43px;" class="ui-button ui-widget ui-corner-all" type="text" name="destBed" id="destBed" value="%s"/>',"");
// // echo '<button id="chairButton">A button element</button>';
// // echo '<button id="bedButton">A button element</button>';
// echo '<div class="dialogButtons">';
// 
// echo		'<input class="clickBed" checked="checked" type="radio" value="0" id="patBed0" name="nBed" /><label for="patBed0">Chair</label>';
// echo		'<input  class="clickBed" type="radio" value="1" id="patBed1" name="nBed" /><label for="patBed1">Bed</label>';
// echo '</div>';
// echo "</div>";
// 
// echo '<div style="float:left;">';
// echo '<label for="name" class="nLabel">Bed number</label><br />';
// printf ('<input maxlength="2" name="nBedNum" style="width:38px;" class="ui-button ui-widget ui-corner-all" type="text" id="nBedNum" value="%s"/>',"");
// echo "</div>";
// 
// 
// 
// 
// 
// 		echo '</div>';


//Reveal
//echo '<section>';
//echo '</div>';
//echo '</div>';



//echo '</div>'; //tabs
	echo '</form>';
// echo <<<END
// <script language="text/javascript">
//  $jsFooter
// </script>
// END;


break;
}; //add
case "formEditRx":{

// print_r($_REQUEST);

	$query = dbGet("mau_visit",$_REQUEST['vid']);
	$nQuery = dbGet("mau_patient",$query['patient']);
	
$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);


$icon = sprintf ('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/%s" /></div>',$baseAuthorRole[5][1]);

echo '<div style="float:left;">';
printf ('<form rel="%s" id="formEditRx" action="http:/'.HOST.'/index.php" method="post">',$nQuery['name']);
formWrite("","hidden","act","dbEditRx");
formWrite("","hidden","vid",$_REQUEST['vid']);
formWrite("","hidden","pid",$nQuery['id']);
echo '<fieldset class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="padding:20px;width:315px;">';
printf ('<input name="drugid" type="hidden" id="drugid" value="%s"/>','');
printf ('<input name="doseid" type="hidden" id="doseid" value="%s"/>','');

echo '<div style="float:left;">';
echo '<label for="drugname" class="nLabel">Drug name</label><br />';
printf ('<input style="width:160px;"name="drugname" class="Xvalidate[required] ui-button ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="drugname" value="%s"/>','');
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="cd" class="nLabel">CD</label><br />';
echo	'<div class="dialogButtons">';
foreach ($drugCD as $k => $v) {
	printf	('<input value="%s" type="radio" id="cd%s" name="cd" /><label for="cd%s">%s</label>',
				$k,$k,$k,$v);
};
echo	"</div>";
echo "</div>";

// Needed for Chrome
echo '<div style="clear:both;"></div>';


echo '<div style="float:left;">';
echo '<label for="str" class="nLabel">Strength</label><br />';
printf ('<input style="width:64px;" name="str" class="Xvalidate[required] ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="str" value="%s"/>','');
echo "</div>";



echo '<div style="float:left;">';
echo '<label for="units" class="nLabel">Units</label><br />';
echo	'<div class="dialogButtons">';
foreach ($drugUnits as $k => $v) {
	printf	('<input value="%s" type="radio" id="units%s" name="units" /><label for="units%s">%s</label>',
				$k,$k,$k,$v[0]);
};
echo	"</div>";

echo "</div>";
echo '<div style="float:left;">';
echo '<label for="dose" class="nLabel">Dose</label><br />';
printf ('<input style="width:32px;" name="dose" class="Xvalidate[required] ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="dose" value="%s"/>','');
echo "</div>";

// echo '<div style="float:left;">';
// echo '<label for="freq" class="nLabel">Dosing frequency</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($drugFreq as $k => $v) {
// 	printf	('<input value="%s" type="radio" id="freq%s" name="freq" /><label for="freq%s">%s</label>',
// 				$k,$k,$k,$v[0]);
// };
// echo	"</div>";
// echo "</div>";

echo '<div style="float:left;">';
echo '<label for="time" class="nLabel">Time of administration</label><br />';
echo	'<div class="dialogButtons">';
foreach ($drugTime as $k => $v) {
	printf	('<input value="%s" type="checkbox" id="time%s" name="time" /><label for="time%s">%s</label>',
				$k,$k,$k,$v[1]);
};
echo	"</div>";
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="freq" class="nLabel">Frequency</label><br />';
echo	'<div class="dialogButtons">';
foreach ($drugReg as $k => $v) {
	printf	('<input value="%s" type="radio" id="freq%s" name="freq" /><label for="freq%s">%s</label>',
				$k,$k,$k,$v);
};
echo	"</div>";
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="route" class="nLabel">Route</label><br />';
echo	'<div class="dialogButtons">';
foreach ($drugRoute as $k => $v) {
	printf	('<input value="%s" type="radio" id="route%s" name="route" /><label for="route%s">%s</label>',
				$k,$k,$k,$v[0]);
};
echo	"</div>";
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="ac" class="nLabel">Repeat</label><br />';
echo	'<div class="dialogButtons">';
foreach ($drugAC as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="ac%s" name="ac" /><label for="ac%s">%s</label>',
				$k==1 ? 'checked="checked" ':'',
				$k,$k,$k,$v);
};
echo	"</div>";
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="drugAddButton" class="nLabel">Action</label><br />';
echo '<a id="drugAddButton">Add</a>';
echo '<a id="drugRestartButton">Reset</a>';
echo "</div>";


echo '</fieldset>';
//echo '<fieldset class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="margin-top:10px;padding:20px;width:335px;">';

// echo '<div style="float:left;">';
// echo '<label for="oxtarget" class="nLabel">Target oxygen sats</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($oxTarget as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" id="oxtarget%s" name="oxtarget" /><label for="oxtarget%s">%s</label>',
// 				$k==2 ? 'checked="checked" ':'',
// 				$k,$k,$k,$v);
// };
// echo	"</div>";
// echo "</div>";
// echo '<div style="float:left;">';
// echo '<label for="clexane" class="nLabel">Enoxaparin dose</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($clexane as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" id="clexane%s" name="clexane" /><label for="clexane%s">%s</label>',
// 				$k==0 ? 'checked="checked" ':'',
// 				$k,$k,$k,$v);
// };
// echo	"</div>";
// echo "</div>";
// echo '<div style="float:left;">';
// echo '<label for="oxstart" class="nLabel">Starting oxygen concentration</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($oxStart as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" id="oxstart%s" name="oxstart" /><label for="oxstart%s">%s</label>',
// 				$k==0 ? 'checked="checked" ':'',
// 				$k,$k,$k,$v);
// };
// echo	"</div>";
// echo "</div>";
//echo '</fieldset>';

echo '</form>';
echo '</div>';

echo '<div style="float:left;">';






echo <<<HTML
<div id="tabs">
	<ul>
		<li><a href="#tabs-1">Prescription</a></li>
		<li><a href="#tabs-2">Notes</a></li>
	</ul>
	<div id="tabs-1" style="width:327px;height:279px;padding:4px 8px 4px 8px;">
<form id="drugList">
<fieldset id="dlist" class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="overflow-y:auto;overflow-x:hidden;width:315px;height:267px;background-image:url(gfx/NotebookPaper.jpg);">
℞<br />
HTML;

$sql = sprintf("SELECT *,mau_rx.dose AS rxdose from mau_rx,rx_drug,rx_dose
		WHERE patient = %s
		AND mau_rx.drug = rx_drug.id
		AND mau_rx.dose = rx_dose.id
		ORDER BY mau_rx.id;",
		$nQuery['id']);
$dbQuery = mysql_query($sql);
if (!$dbQuery) {
    echo 'Could not run query (drugDisplay): ' . mysql_error();
    exit;
};
if (mysql_num_rows($dbQuery) != 0) {
while ($_drug = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {

if ($_drug['give'] == 0) {
 $_giveCSS = ' style="text-decoration:line-through;"';
}
else
{
 $_giveCSS = '';
};

printf ('<span class="_drug"%s>',$_giveCSS);
echo $_drug['name'] . " ";
 echo $_drug['str'] . " ";
 echo $drugUnits[$_drug['units']][0] . " ";
 echo "× ";
 echo "&#" . ($_drug['dose']+10111) . "; ";
 echo $drugFreq[cbits($_drug['time'])][0];

printf ('<input value="%s" type="hidden" name="give">',$_drug['give']);
printf ('<input value="%s" type="hidden" name="drugid">',$_drug['drug']);
printf ('<input value="%s" type="hidden" name="doseid">',$_drug['rxdose']);
printf ('<input value="" type="hidden" name="drugname">','');
printf ('<input value="" type="hidden" name="cd">','');
printf ('<input value="" type="hidden" name="str">','');
printf ('<input value="" type="hidden" name="units">','');
printf ('<input value="" type="hidden" name="dose">','');
printf ('<input value="" type="hidden" name="time">','');
printf ('<input value="" type="hidden" name="freq">','');
printf ('<input value="" type="hidden" name="route">','');
printf ('<input value="%s" type="hidden" name="ac">',$_drug['ac']);
echo '<a class="_R" href="#">✪</a>';
if ($_drug['ac'] == "1") {
echo '<span class="_R">⚕</span>';
};



echo '</span>';
};
};

echo <<<HTML
</fieldset>
</form>
	</div>
	<div id="tabs-2" style="width:327px;height:279px;padding:4px 8px 4px 8px;">
<form id="drugList">
HTML;

formWrite("","hidden","nid",$notes['id']);

echo '<div style="float:left;">';
echo '<label for="note_rec" class="nLabel">Pharmacy and reconcilliation notes</label><br />';
printf ('<textarea name="note_rec" class="ui-widget ui-state-default ui-corner-all SBARfieldL"
type="text" id="note_rec" >%s</textarea>',$notes['rec']);
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="note_disc" class="nLabel">Discharge advice</label><br />';
printf ('<textarea name="note_disc" class="ui-widget ui-state-default ui-corner-all SBARfieldL"
type="text" id="note_disc" >%s</textarea>',$notes['disc']);
echo "</div>";

echo <<<HTML
</form>
	</div>
</div>
HTML;

// echo '<form id="drugList">';
// echo '<fieldset id="dlist" class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="padding:20px;width:315px;height:284px;background-image:url(gfx/NotebookPaper.jpg);">';
// echo '</fieldset>';
// echo '</form>';
echo '</div>';

$jsOut="var drugTimes=[''"; foreach ($drugFreq as $k=>$v) {
 $jsOut .= ',"' . $v[0] . '"';
}; $jsOut.='];';

echo <<<END
<script type="text/javascript">
 $jsOut
 
 $(function() {
   _rxChanged = 0;
   $('#tabs').tabs();
   $('#tabs-1').css('padding','0.25em 0.5em');
   $('.dialogButtons').buttonset().css('font-size','12px');
   $('#formEditRx .noteAuthorField').css('height','15px');
   $('.ui-dialog-buttonpane').prepend('{$icon}');
   // $('.ui-dialog-buttonset .ui-button:first').css('margin-right','440px');

$('._drug').click(function(){
   	 _rxChanged = 1;
if ($(this).find('input[name=give]').val() == 1)
{
 $(this).css('text-decoration','line-through');
 $(this).find('input[name=give]').val(0);
}
else
{
 $(this).css('text-decoration','none');
 $(this).find('input[name=give]').val(1);
};
});

   $('._drug a._R').hover(function(){
   	$(this).parent().addClass("_drughover");
   },function(){
   	$(this).parent().removeClass("_drughover");
   }).live('click',function(){
   	$(this).parent().remove();
   	 _rxChanged = 1;
   });

   $('#formEditRx input[name=drugname]').autocomplete(
    {
			source: trak.url + "?act=ajax&type=drug",
			minLength: 2,
			select: function(e,ui){
				$('#formEditRx input[name=drugname]').val(ui.item.label).attr('readonly',true);
				$('#formEditRx input[name=drugid]').val(ui.item.value).attr('readonly',true);
				$("#formEditRx input[name=cd]").filter("[value=" + ui.item.cd + "]").attr("checked",true);
				$("#formEditRx input[name=cd]").attr('disabled',true).button("refresh");
				$('#formEditRx input[name=str]').focus(function(){
					// Shows the autocomplete list when dose field gains focus
        			$(this).val(''); $(this).keydown();
    			});
				return false;
			}
	}).focus();



        $('#formEditRx input[name=str]').autocomplete
        ({ 
            source: function( request, response )
            {                      
                $.ajax(
                { 
                    url: trak.url,
                    data: {
                    		act:	'ajax',
                    		type:	'dose',
                            term:	$('#formEditRx input[name=drugid]').val()                            
                          },        
                    type: "POST",
                    dataType: "json",                                                                                                                                   
                    success: function( data ) 
                    {
                        response( $.map( data, function( item ) 
                        {
                            return{
                                    label: item.label,
                                    value: item.value,
                                    units: item.units,
                                    time:  item.time,
                                    str:   item.str,
                                    dose:  item.dose,
                                    route: item.route,
                                    freq:  item.freq
                                   }
                        }));
    	            },
                }); // ajax                
            },
            minLength: 0,
			select: function(e,ui){
				$('#formEditRx input[name=doseid]').val(ui.item.value).attr('readonly',true);
				$('#formEditRx input[name=str]').val(ui.item.str).attr('readonly',true);
				$('#formEditRx input[name=dose]').val(ui.item.dose).attr('readonly',true);
				$("#formEditRx input[name=units]").filter("[value=" + ui.item.units + "]").attr("checked",true);
				$("#formEditRx input[name=units]").attr('disabled',true).button("refresh");
				$("#formEditRx input[name=route]").filter("[value=" + ui.item.route + "]").attr("checked",true);
				$("#formEditRx input[name=route]").attr('disabled',true).button("refresh");
				$("#formEditRx input[name=freq]").filter("[value=" + ui.item.freq + "]").attr("checked",true);
				$("#formEditRx input[name=freq]").attr('disabled',true).button("refresh");
				for (i = 0; i <= 5; i++) {
				if (ui.item.time & Math.pow(2,i))
				{
					$("#formEditRx input[id=time" + Math.pow(2,i) + "]").attr("checked",true).attr('disabled',true).button("refresh");
				} else
				{
					$("#formEditRx input[id=time" + Math.pow(2,i) + "]").attr("checked",false).attr('disabled',true).button("refresh");
				};
				};
				return false;
			}
        });









 
   $("#formEditRx #drugAddButton").button({icons:{primary: "ui-icon-plus"}}).click(function(){  
    $("#dlist").append(function(){
       _rxChanged = 1;
		 _tVal = 0; _count = 0;
		 $("#formEditRx input[name=time]:checked").each(function(){
		  _tVal += Number($(this).val()); _count++;
		 });
 		 _dVal = Number($('#formEditRx input[name=dose]').val()) + 10111;
		 $('#tabs').tabs( "select" , 0 )
		 _give   = '<input value="1" type="hidden" name="give" />';
		 _drug   = '<input value="'+ $('#formEditRx input[name=drugname]').val()      +'" type="hidden" name="drugname" />' + $('#formEditRx input[name=drugname]').val();
		 _id     = '<input value="'+ $('#formEditRx input[name=drugid]').val()        +'" type="hidden" name="drugid" />';
		 _doseid = '<input value="'+ $('#formEditRx input[name=doseid]').val()        +'" type="hidden" name="doseid" />';
		 _cd     = '<input value="'+ $('#formEditRx input[name=cd]:checked').val()    +'" type="hidden" name="cd" />';
		 _str    = '<input value="'+ $('#formEditRx input[name=str]').val()           +'" type="hidden" name="str" /> '     + $('#formEditRx input[name=str]').val();
		 _units  = '<input value="'+ $('#formEditRx input[name=units]:checked').val() +'" type="hidden" name="units" /> '   + $('#formEditRx input[name=units]:checked').next().html();
		 _dose   = '<input value="'+ $('#formEditRx input[name=dose]').val()          +'" type="hidden" name="dose" /> × &#'  + _dVal + '; ';
		 _time   = '<input value="'+ _tVal +'" type="hidden" name="time" />';
		 _freq   = '<input value="'+ $('#formEditRx input[name=freq]:checked').val()  +'" type="hidden" name="freq" />';
		 _route  = '<input value="'+ $('#formEditRx input[name=route]:checked').val() +'" type="hidden" name="route" />';
		 _ac     = '<input value="'+ $('#formEditRx input[name=ac]:checked').val()    +'" type="hidden" name="ac" />';
		 _remove = '<a class="_R" href="#">✪</a>';
		if ($('#formEditRx input[name=ac]:checked').val() == "1") {
			_acs = '<span class="_R">⚕</span>';
		}
		else
		{
			_acs = '';
		};
		$('#formEditRx input[name=drugname]').val('').attr('readonly',false);
		$('#formEditRx input[name=drugid]').val('').attr('readonly',false);
		$('#formEditRx input[name=doseid]').val('').attr('readonly',false);
		$('#formEditRx input[name=cd]').attr("checked",false).attr('disabled',false).button("refresh");
		$('#formEditRx input[name=str]').val('').attr('readonly',false);
		$('#formEditRx input[name=dose]').val('').attr('readonly',false);
		$("#formEditRx input[name=units]").attr("checked",false).attr('disabled',false).button("refresh");
		$("#formEditRx input[name=freq]").attr("checked",false).attr('disabled',false).button("refresh");
		$("#formEditRx input[name=route]").attr("checked",false).attr('disabled',false).button("refresh");
		_fr = '(<span style="letter-spacing:-5px;">';
		for (i = 0; i <= 5; i++) {		
			if ($("#formEditRx input[id=time" + Math.pow(2,i) + "]").prop("checked"))
			{
			 _fr += "▮";
			}
			else
			{
			 _fr += "▯";
			};
			$("#formEditRx input[id=time" + Math.pow(2,i) + "]").attr("checked",false).attr('disabled',false).button("refresh");
		};
		_fr += "</span>)<br />";		
		$("#formEditRx input[name=ac]").filter("[value=1]").attr("checked",true).button("refresh");
		_s = '<span class="_drug">';
		_e = '</span>';
		return (_s + _drug + _id + _doseid + _cd + _str + _units + _dose + drugTimes[_count] + _time + _freq + _route + _give + _ac + _remove + _acs + _e);
	}); // append
	$('._drug a._R').last().hover(function(){
   			$(this).parent().addClass("_drughover");
  		},function(){
   			$(this).parent().removeClass("_drughover");
   	});
   	
   	$('._drug').click(function(){
		if ($(this).find('input[name=give]').val() == 1)
		{
		 $(this).css('text-decoration','line-through');
		 $(this).find('input[name=give]').val(0);
		}
		else
		{
		 $(this).css('text-decoration','none');
		 $(this).find('input[name=give]').val(1);
		};
	});
   	
   	
   	
   }).css('font-size','12px'); // button


   $("#formEditRx #drugRestartButton").button({icons:{primary: "ui-icon-arrowrefresh-1-n"}}).click(function(){  

		$('#formEditRx input[name=drugname]').val('').attr('readonly',false).focus();
		$('#formEditRx input[name=drugid]').val('').attr('readonly',false);
		$('#formEditRx input[name=doseid]').val('').attr('readonly',false);
		$('#formEditRx input[name=cd]').attr("checked",false).attr('disabled',false).button("refresh");
		$('#formEditRx input[name=str]').val('').attr('readonly',false);
		$('#formEditRx input[name=dose]').val('').attr('readonly',false);
		$("#formEditRx input[name=units]").attr("checked",false).attr('disabled',false).button("refresh");
		$("#formEditRx input[name=freq]").attr("checked",false).attr('disabled',false).button("refresh");
		$("#formEditRx input[name=route]").attr("checked",false).attr('disabled',false).button("refresh");
		for (i = 0; i <= 5; i++) {
			$("#formEditRx input[id=time" + Math.pow(2,i) + "]").attr("checked",false).attr('disabled',false).button("refresh");
		};
		$("#formEditRx input[name=ac]").filter("[value=1]").attr("checked",true).button("refresh");

   }).css('font-size','12px');

 });
</script>
END;


break;


};
case "formEditNursing":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

$query = dbGet("mau_visit",$_REQUEST['vid']);
$nQuery = dbGet("mau_patient",$query['patient']);
$icon = sprintf ('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/%s" /></div>',$baseAuthorRole[2][1]);
$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);
//
$ref    = dbGet("mau_referral",$_REQUEST['id']);
//
printf ('<form id="formEditNursing" action="http:/'.HOST.'/index.php" method="post">');
formWrite("","hidden","act","dbEditNursing");
formWrite("","hidden","rid",$_REQUEST['id']);
formWrite("","hidden","vid",$_REQUEST['vid']);
formWrite("","hidden","pid",$nQuery['id']);
formWrite("","hidden","nid",$notes['id']);
formWrite("","hidden","nld",$query['nld']);
// echo <<<HTML
// 
// <div id="tabs">
//         <ul>
//             <li><a href="#tabs-1">History</a></li>
//             <li><a href="#tabs-2">Plan & Alerts</a></li>
//             <li><a href="#tabs-3">⚠</a></li>
//             <li class="ui-tab-dialog-close"></li>
//         </ul>
//         <div>
//             <div id="tabs-1">
// 
// 
// HTML;

// class="ui-widget ui-state-default ui-corner-all"

// echo '<div style="float:left;">';
// echo '<label for="pc" class="nLabel">Presenting complaint</label><br />';
// printf ('<textarea name="pc" class="ui-widget ui-state-default ui-corner-all SBARfield"
// type="text" id="pc" >%s</textarea>',$notes['pc']);
// echo '<br />';
// echo '<label for="wd" class="nLabel">Working diagnosis</label><br />';
// printf ('<textarea name="wd" class="ui-widget ui-state-default ui-corner-all SBARfield"
// type="text" id="wd" >%s</textarea>',$notes['wd']);
// echo "</div>";

//unused
// echo '<div style="float:left;">';
// 
// //echo '<form id="pmhxList">';
// echo '<label style="padding-left:3px;margin-left:1px;" for="note_rec" class="nLabel">Past medical history</label><br />';
// echo '<fieldset id="hlist" class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="overflow-y:auto;overflow-x:hidden;width:300px;height:102px;">';
// 
// 
// $sql = sprintf("SELECT * FROM mau_pmhx,med_pmhx
// 		WHERE patient = %s
// 		AND mau_pmhx.cond = med_pmhx.id
// 		ORDER BY mau_pmhx.id;",
// 		$nQuery['id']);
// $dbQuery = mysql_query($sql);
// if (!$dbQuery) {
//     echo 'Could not run query (pmhxDisplay): ' . mysql_error();
//     exit;
// };
// if (mysql_num_rows($dbQuery) != 0) {
// while ($_drug = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
// 
// 			$o_s = '<span class="_cond">';
// 			$o_e = '</span>';
// 			$o_name	= $_drug['comorb'];
// 			$o_id		= '<input value="'. $_drug['id'] .'" type="hidden" name="pmhx" />';
// 			$o_nameid	= '<input value="" type="hidden" name="pmhxname" />';
// 			$o_remove = '<a class="_R" href="#">✪</a>';
// 
// 			echo $o_s . $o_name . $o_id . $o_nameid . $o_remove . $o_e;
// 
// }
// }
// 
// 
// 
// 
// 
// 
// 
// 
// echo '</fieldset>';
// //echo '</form>';
// 
// 
// echo '<div style="float:left;">';
// printf ('<input style="padding-right:3px;margin-right:1px;padding-left:3px;margin-left:1px;margin-top:3px;
// width:235px;" name="pmhxauto" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="pmhxauto" value=""/>');
// echo '<a id="condAddButton">Add</a>';
// echo "</div>";
// 
// echo "</div>";
//form_PastMedicalHistory($nQuery['id']);
echo '<div id="_hx">';

echo '<div style="float:left;width:312px;">';
form_ActiveDiagnosis($nQuery['id']);
form_PastMedicalHistory($nQuery['id']);

echo '<div style="float:left;">';
echo '<label for="alert" class="nLabel">Whiteboard alert</label><br />';
printf ('<input name="alert" class="ui-widget ui-state-default ui-corner-all noteAuthorField" style="width:300px;" type="text" id="alert" value="%s"/>',$query['alert']);
echo	"</div>";
echo '</div>';

echo '<label for="plan" class="nLabel">Nursing plan</label><br />';
echo '<div class="notePaper" style="float:left;width:300px;"><div class="_smaller">';

//echo '<div style="float:left;">'; 

printf ('<textarea class="_smallNote" name="plan" type="text" id="plan" >%s</textarea>',$__AES->encrypt($notes['plan'] , $__PW, 256) );
//echo "</div>";

echo '</div></div>';

// echo '<div style="float:left;">';
// echo '<label for="jobs" class="nLabel">Jobs</label><br />';
// printf ('<textarea name="jobs" class="ui-widget ui-state-default ui-corner-all SBARfield" style="width:290px;"
// type="text" id="jobs" >%s</textarea>',$notes['jobs']);
// echo "</div>";

echo '<label for="jobs" class="nLabel">Jobs</label><br />';
echo '<div class="notePaper" style="float:left;width:300px;"><div class="_smaller">';
printf ('<textarea class="_smallNote" name="jobs" type="text" id="jobs" >%s</textarea>',$__AES->encrypt($notes['jobs'] , $__PW, 256) );
echo '</div></div>';



echo '<div style="float:left;width:290px;">';
echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Frailty</label><br />';
printf(	'<div class="_noselect patient-frailty" id="_patient-frailty">%s</div>',  $query['frailty'] == 0 ? 'Not set' :  $frailtyScale[$query['frailty']]	);
printf( '<input type="hidden" value="%s" id="_patient-frailty-code" name="patient-frailty-code" />', $query['frailty'] == 0 ? 0 : $query['frailty']);
echo '</div>';

echo '<div style="float:left;">';
echo '<label for="triage" class="nLabel">Resuscitate</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseDNAR as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="resus%s" name="resus" /><label for="resus%s">%s</label>',
				$nQuery['dnar'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";
echo	"</div>";

echo '<div style="float:left;width:290px;">';
echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Mobility</label><br />';
printf(	'<div class="_noselect patient-mobility" id="_patient-mobility">%s</div>',  $query['mobility'] == 0 ? 'Not set' :  $mobilityScale[$query['mobility']]	);
printf( '<input type="hidden" value="%s" id="_patient-mobility-code" name="patient-mobility-code" />', $query['mobility'] == 0 ? 0 : $query['mobility']);
echo '</div>';

// echo '<div style="float:left;">';
// echo '<label for="_ewsButton" class="nLabel">EWS</label><br />';
// printf(	'<div class="_noselect patient-ews" id="_patient-ews">%s</div>',  $query['ews']	);
// printf( '<input type="hidden" value="%s" id="_patient-ews-code" name="patient-ews-code" />', $query['ews'] );
// echo '</div>';
// echo	"</div>";
form_ews($query['ews']);


// echo '<label for="status" class="nLabel">Review status</label><br />';
// echo	'<div class="dialogButtons" id="statusButtons">';
// foreach ($refStatus as $k => $v) {
// 	$_checked = $ref['status'] & $k;
// 	printf	('<input %svalue="%s" class="validate[required,groupRequired[jobStat]]" type="radio" id="status%s" name="status" /><label for="status%s">%s</label>',
// 				$_checked ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v);
// };
// echo	"</div>";

// Shim:
// Old entries use status == 0 == 1
if ( $ref['status'] == '0' ) { $ref['status'] = '1'; };
printf( '<input type="hidden" data-text="%s" value="%s" id="_patient-status-code" name="patient-status-code" />', $refStatus[$ref['status']], $ref['status']);


echo '</div>'; // _hx

// echo '<div style="float:left;">';
// echo '<label for="radio" class="nLabel">Early Warning Score</label><br />';
// echo	'<div class="dialogButtons">';
// for($loop=0;$loop<=5;$loop++) {
// 	printf	('<input %svalue="%s" type="radio" id="ewsRadio%s" name="ews" /><label for="ewsRadio%s">%s</label>',
// 				$query['ews'] == $loop ? 'checked="checked" ' : "",
// 				$loop,$loop,$loop,$loop);
// };
// echo	"</div>";
// echo	"</div>";

//unused
// echo '<div style="float:left;">';
// echo '<label for="triage" class="nLabel">Manchester triage</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($baseTriage as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s"><span style="color:#%s">&#9679; </span>%s</label>',
// 				$query['triage'] == $k ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v[1],$v[0]);};
// printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s">%s</label>',
// 				$query['triage'] == 0 ? 'checked="checked" ' : "",
// 				0,0,0,'None');
// 				echo	"</div>";
// echo	"</div>";


//new
	$_scs=array('Ag'=>'','Ai'=>'','Br'=>'','Ci'=>'','Di'=>'','EC'=>'','Fe'=>'');
	if ($notes['scs']!='') {
		$_s = multi_parse_str($notes['scs']);
		foreach($_scs as $key => &$val) {
			$val = $_s['_'.$key][0];
		};
	} else {
		foreach($_scs as $key => &$val) {
			$val = '-1';
		};
	};
//



//echo '<div style="float:left;">';
echo '<div id="_tri" style="display:none;">';
foreach ($scs as $k => $v) {
printf ('<div style="display:none;" id="id_%s">',$k);
$_loop = 0;
foreach ($v as $x) {
	$_vars = explode(':',$x);
	if (!isset($_vars[2])) {
		printf ('<div class="_scsButton" data-type="%s" data-value="%s" data-choice="%s">',$k,$_vars[0],$_loop);
		printf ('%s',$_vars[1]);
		echo '</div>';
	}
	else
	{
		if (years_old($nQuery['dob']) >= $_vars[2]) {
			printf ('<div class="_scsButton" data-type="%s" data-value="%s" data-choice="%s">',$k,$_vars[0],$_loop);
			printf ('%s',$_vars[1]);
			echo '</div>';		
		}
	};
$_loop++;
};
printf ('<div style="margin-top:4px;" class="_scsButton" data-type="%s" data-value="%s" data-choice="-1">',$k,0);
printf ('%s','Not set');
echo '</div>';
echo '</div>';
};
printf( '<div style="clear:both;float:left;"><label for="_flow" class="nLabel">Simple clinical score</label><br />');
echo '<fieldset id="_scsform" class="_refborder" style="width:280px;">';
echo '<div style="float:right;" id="_scs"></div>';	
$_ageScore=0;
if (years_old($nQuery['dob']) > 75) {
	$_ageScore=4;
};
if (years_old($nQuery['dob']) <= 75) {
	if ($nQuery['gender'] == '1') {
		// Male
		if (years_old($nQuery['dob']) >=50) {
			$_ageScore=2;	
		};
	}
	else
	{
		// Female
		if (years_old($nQuery['dob']) >=55) {
			$_ageScore=2;		
		};
	};
};
printf ('<div style="display:none;" data-set="%s" class="_scsButtonSelected" id="scsDefault_Age"></div>',$_ageScore);
//new
printf ('<input type="hidden" name="_Ag" value="%s">',$_ageScore);
//
foreach ($scs as $k => $v) {
echo '<div>';
printf( '<label for="label_%s" class="nLabel">%s</label><br />',$k,$k);
//new
if ($_scs[substr($k,0,2)]=='-1') {
	$_desc='Not set';
	$_dval='0';
} else {
	$_temp = explode(':',$scs[$k][$_scs[substr($k,0,2)]]);
	$_desc = $_temp[1];
	$_dval = $_temp[0];
};
printf ('<div data-type="%s" data-set="%s" class="_scsButtonSelected" id="scsDefault_%s">%s</div>',$k,$_dval,$k,$_desc);
printf ('<input type="hidden" name="_%s" value="%s">',substr($k,0,2),$_scs[substr($k,0,2)]);
//
echo '</div>';

};


if ($query['triage'] == 127) {
	$query['triage'] = 0;
};
echo '<div style="float:left;">';
echo '<label for="triage" class="nLabel">Triage</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseTriage as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s"><span style="color:#%s">&#9679; </span>%s</label>',
				$query['triage'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v[1],$v[0]);};
printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label style="margin-left:6px" for="triage%s">%s</label>',
				$query['triage'] == 0 ? 'checked="checked" ' : "",
				0,0,0,'None');			
echo	"</div>";
echo	"</div>";

echo '</fieldset></div>';
//echo	"</div>";










// echo '<div id="_tri" style="display:none;">';
$jsFooter='';
// foreach ($scs as $k => $v) {
// printf ('<div style="display:none;" id="id_%s">',$k);
// foreach ($v as $x) {
// 	$_vars = explode(':',$x);
// 	if (!isset($_vars[2])) {
// 		printf ('<div class="_scsButton" data-type="%s" data-value="%s">',$k,$_vars[0]);
// 		printf ('%s',$_vars[1]);
// 		echo '</div>';
// 	}
// 	else
// 	{
// 		if (years_old($nQuery['dob']) >= $_vars[2]) {
// 			printf ('<div class="_scsButton" data-type="%s" data-value="%s">',$k,$_vars[0]);
// 			printf ('%s',$_vars[1]);
// 			echo '</div>';		
// 		}
// 	};
// };
// printf ('<div style="margin-top:4px;" class="_scsButton" data-type="%s" data-value="%s">',$k,0);
// printf ('%s','Not set');
// echo '</div>';
// echo '</div>';
// };
// printf( '<div style="clear:both;float:left;"><label for="_flow" class="nLabel">Simple clinical score</label><br />');
// echo '<fieldset name="_flow" class="_refborder" style="width:280px;">';
// echo '<div style="float:right;" id="_scs"></div>';
// $_ageScore=0;
// if (years_old($nQuery['dob']) > 75) {
// 	$_ageScore=4;
// };
// if (years_old($nQuery['dob']) <= 75) {
// 	if ($nQuery['gender'] == '1') {
// 		// Male
// 		if (years_old($nQuery['dob']) >=50) {
// 			$_ageScore=2;	
// 		};
// 	}
// 	else
// 	{
// 		// Female
// 		if (years_old($nQuery['dob']) >=55) {
// 			$_ageScore=2;		
// 		};
// 	};
// };
// printf ('<div style="display:none;" data-set="%s" class="_scsButtonSelected" id="scsDefault_Age"></div>',$_ageScore);
// foreach ($scs as $k => $v) {
// echo '<div>';
// printf( '<label for="label_%s" class="nLabel">%s</label><br />',$k,$k);
// printf ('<div data-set="%s" class="_scsButtonSelected" id="scsDefault_%s">Not set</div>',0,$k);
// echo '</div>';
// $jsFooter .= sprintf ("$('#scsDefault_%s').click(function(){
// 	$(this).qtip({
// 	overwrite:	true,
// 	hide:	 	{
//     	event:	'unfocus'
//     },
// 	show: 		{
// 		event:	'click',
// 		ready:	true
//       },
// 	content:	{
//       text: $('#id_%s')
//       },
// 	position:	{
// 				viewport: $(window),
// 				my: 'left center',
//         		at: 'center'
//   	  			},
//   	style:		{
// 				width:	200,
// 				classes: 'ui-tooltip-dark qtOverride',
//         		tip:	{
//          				corner: true
//          				}
//       			},
//     events:		{
// 		render:	function(event,api){
// 
// 	 $('._scsButton').click(function(){
// 
// 			$('#scsDefault_'+$(this).attr('data-type')).attr('data-set',$(this).attr('data-value'));
// 			$('#scsDefault_'+$(this).attr('data-type')).button('option','label',$('.ui-button-text',this).html());
// 			$('#scsDefault_'+$(this).attr('data-type')).qtip('hide');
// 			
// 				_total = 0; $('._scsButtonSelected').each(function(){	
// 					_total += Number($(this).attr('data-set'));				
// 				});
// 				$('#_scs').html(function(){
// 				
// 					if (_total.between(0,7))
// 					{
// 						$('#triage3').attr('checked','checked').button('refresh');						
// 						return '<img style=\"margin-left:6px;margin-top:4px;\" src=\"gfx/green_light.png\" width=\"22\" height=\"22\">';
// 					};
// 					if (_total.between(8,11))
// 					{
// 						$('#triage2').attr('checked','checked').button('refresh');
// 						return '<img style=\"margin-left:6px;margin-top:4px;\" src=\"gfx/yellow_light.png\" width=\"22\" height=\"22\">';
// 					};				
// 					if (_total.between(12,40))
// 					{
// 						$('#triage1').attr('checked','checked').button('refresh');
// 						return '<img style=\"margin-left:6px;margin-top:4px;\" src=\"gfx/red_light.png\" width=\"22\" height=\"22\">';
// 					};
// 				});
// 	
// 	 }).button({icons:{primary:'ui-icon-link'}}).css('font-size','13px');
// }
//     }
// })});",$k,$k,$k,$k);
// };
// 
// 
// // triage = 127 when admitted but triage not set
// // make it 0 when displaying nursing page
// // in db, if triage = 127 but due to be set to 0, will not be changed
// // ie. can only be cleared from 127 when set to something other than 0
// //     when triage is assessed
// if ($query['triage'] == 127) {
// 	$query['triage'] = 0;
// };
// echo '<div style="float:left;">';
// echo '<label for="triage" class="nLabel">Triage</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($baseTriage as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s"><span style="color:#%s">&#9679; </span>%s</label>',
// 				$query['triage'] == $k ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v[1],$v[0]);};
// printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label style="margin-left:6px" for="triage%s">%s</label>',
// 				$query['triage'] == 0 ? 'checked="checked" ' : "",
// 				0,0,0,'None');			
// echo	"</div>";
// echo	"</div>";
// echo '</fieldset></div>';







printf( '<div style="float:left;"><label for="_flow" class="nLabel">AMB score (under development)</label><br />');
echo '<fieldset name="_flowamb" class="_refborder" style="width:260px;">';

if (years_old($nQuery['dob']) >= 80) {
$_ambAgeScore=-0.5;
} else {
$_ambAgeScore=0;
};
if ($nQuery['gender'] == '1') {
$_ambGenScore=-0.5;
} else {
$_ambGenScore=0;
};
printf('<input type="hidden" name="ambgender" value="%s">',$_ambGenScore);
printf('<input type="hidden" name="ambage" value="%s">',$_ambAgeScore);

foreach ($amb as $k => $v) {
$_desc = explode(":",$k); $_loop=0;
echo '<div style="clear:both;float:left;">';
printf('<label class="nLabel">%s</label><br />',$_desc[0]);
echo	'<div class="dialogButtons">';
foreach ($v as $x) {
	$_vars = explode(':',$x);
	printf ('<input class="_ambFlip" %svalue="%s" type="radio" id="%s" name="%s" /><label class="_ambRadio" for="%s">%s</label>',
	$_loop == 0 ? 'checked="checked" ' : '',
	$_vars[0],$_desc[1].$_loop,$_desc[1],$_desc[1].$_loop,$_vars[1]
);
$_loop++;
};
echo '</div>';
echo '</div>';

};

echo '</fieldset>';
echo '</div>';


$jsFooter .= sprintf('

$("._ambFlip").change(function(){ambFlip()});


function ambFlip(){

var _a = parseFloat($("input[name=ambgender]").val());
var _b = parseFloat($("input[name=ambage]").val());
var _c = parseFloat($("input[name=trans]:checked").val());
var _d = parseFloat($("input[name=rx]:checked").val());
var _e = parseFloat($("input[name=mental]:checked").val());
var _f = parseFloat($("input[name=mews]:checked").val());
var _g = parseFloat($("input[name=dx]:checked").val());
var _score = _a+_b+_c+_d+_e+_f+_g;
trak.fn.statusMessageDialog("Amb score is " + _score);


};


');


echo	"</div></form>"; // _tri


echo '<div id="_nldd" style="display:none;margin-left:100px;">';
echo '<form id="_formnld">';
form_nld($notes,1);
echo '</form>';
echo '</div>';




echo <<<HTML
<script type="text/javascript">

  $(function() {
	 $('.ui-dialog-buttonpane').prepend('{$icon}');
	 $jsFooter
 });
</script>
HTML;






break;
};
case "formEditMedic":{

$query = dbGet("mau_visit",$_REQUEST['vid']);
$nQuery = dbGet("mau_patient",$query['patient']);
$icon = sprintf ('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/%s" /></div>',$baseAuthorRole[1][1]);
$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);





printf ('<form rel="%s" id="formEditMedic" action="http:/'.HOST.'/index.php" method="post">',$nQuery['name']);
formWrite("","hidden","act","dbEditMedic");
formWrite("","hidden","vid",$_REQUEST['vid']);
formWrite("","hidden","pid",$nQuery['id']);
formWrite("","hidden","nid",$notes['id']);
echo <<<HTML

<div id="tabs">
        <ul>
            <li><a href="#tabs-1">History</a></li>
            <li><a href="#tabs-2">Plan & Alerts</a></li>
            <li><a href="#tabs-3">⚠</a></li>
            <li class="ui-tab-dialog-close"></li>
        </ul>
        <div>
            <div id="tabs-1">


HTML;

// class="ui-widget ui-state-default ui-corner-all"

// echo '<div style="float:left;">';
// echo '<label for="pc" class="nLabel">Presenting complaint</label><br />';
// printf ('<textarea name="pc" class="ui-widget ui-state-default ui-corner-all SBARfield"
// type="text" id="pc" >%s</textarea>',$notes['pc']);
// echo '<br />';
// echo '<label for="wd" class="nLabel">Working diagnosis</label><br />';
// printf ('<textarea name="wd" class="ui-widget ui-state-default ui-corner-all SBARfield"
// type="text" id="wd" >%s</textarea>',$notes['wd']);
// echo "</div>";
// Dx
// echo '<div style="float:left;">';
// echo '<label style="padding-left:3px;margin-left:1px;" for="note_rec" class="nLabel">Active diagnosis</label><br />';
// echo '<fieldset id="ahlist" class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="overflow-y:auto;overflow-x:hidden;width:300px;height:102px;">';
// $sql = sprintf("SELECT * FROM mau_activehx,med_activehx
// 		WHERE patient = %s
// 		AND mau_activehx.cond = med_activehx.id
// 		ORDER BY mau_activehx.id;",
// 		$nQuery['id']);
// $dbQuery = mysql_query($sql);
// if (!$dbQuery) {
//     echo 'Could not run query (activehxDisplay): ' . mysql_error();
//     exit;
// };
// if (mysql_num_rows($dbQuery) != 0) {
// while ($_drug = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
// 
// 			$o_s = '<span class="_cond">';
// 			$o_e = '</span>';
// 			$o_name	= $_drug['comorb'];
// 			$o_id		= '<input value="'. $_drug['id'] .'" type="hidden" name="acthx" />';
// 			$o_nameid	= '<input value="" type="hidden" name="acthxname" />';
// 			$o_remove = '<a class="_R" href="#">✕</a>';
// 
// 			echo $o_s . $o_name . $o_id . $o_nameid . $o_remove . $o_e;
// 
// }
// }
// echo '</fieldset>';
// echo '<div style="float:left;">';
// printf ('<input style="padding-right:3px;margin-right:1px;padding-left:3px;margin-left:1px;margin-top:3px;
// width:235px;" name="activehxauto" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="activehxauto" value=""/>');
// echo '<a id="activecondAddButton">Add</a>';
// echo "</div>";
// echo "</div>";

form_ActiveDiagnosis($nQuery['id']);

// PMHx
// echo '<div style="float:left;">';
// echo '<label style="padding-left:3px;margin-left:1px;" for="note_rec" class="nLabel">Past medical history</label><br />';
// echo '<fieldset id="hlist" class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="overflow-y:auto;overflow-x:hidden;width:300px;height:102px;">';
// $sql = sprintf("SELECT * FROM mau_pmhx,med_pmhx
// 		WHERE patient = %s
// 		AND mau_pmhx.cond = med_pmhx.id
// 		ORDER BY mau_pmhx.id;",
// 		$nQuery['id']);
// $dbQuery = mysql_query($sql);
// if (!$dbQuery) {
//     echo 'Could not run query (pmhxDisplay): ' . mysql_error();
//     exit;
// };
// if (mysql_num_rows($dbQuery) != 0) {
// while ($_drug = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
// 
// 			$o_s = '<span class="_cond">';
// 			$o_e = '</span>';
// 			$o_name	= $_drug['comorb'];
// 			$o_id		= '<input value="'. $_drug['id'] .'" type="hidden" name="pmhx" />';
// 			$o_nameid	= '<input value="" type="hidden" name="pmhxname" />';
// 			$o_remove = '<a class="_R" href="#">✕</a>';
// 
// 			echo $o_s . $o_name . $o_id . $o_nameid . $o_remove . $o_e;
// 
// }
// }
// echo '</fieldset>';
// echo '<div style="float:left;">';
// printf ('<input style="padding-right:3px;margin-right:1px;padding-left:3px;margin-left:1px;margin-top:3px;
// width:235px;" name="pmhxauto" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="pmhxauto" value=""/>');
// echo '<a id="condAddButton">Add</a>';
// echo "</div>";
// echo "</div>";
form_PastMedicalHistory($nQuery['id']);


echo <<<HTML

            </div>
            <div id="tabs-2">
HTML;

echo '<div style="float:left;">';
echo '<label for="plan" class="nLabel">Plan</label><br />';
printf ('<textarea name="plan" class="ui-widget ui-state-default ui-corner-all SBARfieldTall"
type="text" id="plan" >%s</textarea>',$notes['plan']);
echo "</div>";
echo '<div style="float:left;">';
echo '<label for="jobs" class="nLabel">Jobs</label><br />';
printf ('<textarea name="jobs" class="ui-widget ui-state-default ui-corner-all SBARfieldTall"
type="text" id="jobs" >%s</textarea>',$notes['jobs']);
echo "</div>";


echo '<div style="float:left;">';
echo '<label for="radio" class="nLabel">Early Warning Score</label><br />';
echo	'<div class="dialogButtons">';
for($loop=0;$loop<=5;$loop++) {
	printf	('<input %svalue="%s" type="radio" id="ewsRadio%s" name="ews" /><label for="ewsRadio%s">%s</label>',
				$query['ews'] == $loop ? 'checked="checked" ' : "",
				$loop,$loop,$loop,$loop);
};
echo	"</div>";
echo	"</div>";

echo '<div style="float:left;">';
echo '<label for="triage" class="nLabel">Manchester triage</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseTriage as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s"><span style="color:#%s">&#9679; </span>%s</label>',
				$query['triage'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v[1],$v[0]);};
printf	('<input %svalue="%s" type="radio" id="triage%s" name="triage" /><label for="triage%s">%s</label>',
				$query['triage'] == 0 ? 'checked="checked" ' : "",
				0,0,0,'None');
				echo	"</div>";
echo	"</div>";

echo '<div style="float:left;">';
echo '<label for="triage" class="nLabel">Resuscitate</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseDNAR as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="resus%s" name="resus" /><label for="resus%s">%s</label>',
				$nQuery['dnar'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";

echo <<<HTML
			</div>
            <div id="tabs-3">
HTML;

echo '<div style="float:left;">';
echo '<label for="alert" class="nLabel">Whiteboard alert</label><br />';
printf ('<input name="alert" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="alert" value="%s"/>',$query['alert']);
echo	"</div>";

echo <<<HTML
			
            </div>
        </div>
</div>
</form>
<script type="text/javascript">
 $(function() {
	 $('.ui-dialog-buttonpane').prepend('{$icon}');
 });
</script>
HTML;






break;
};
case "formEditCP":{ // Consultant physician

// id, vid, type

$query = dbGet("mau_visit",$_REQUEST['vid']);
$nQuery = dbGet("mau_patient",$query['patient']);
$icon = sprintf ('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/%s" /></div>',$baseAuthorRole[18][1]);
$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);
$ref    = dbGet("mau_referral",$_REQUEST['id']);

printf ('<form id="formEditCP" action="http:/'.HOST.'/index.php" method="post">');
formWrite("","hidden","act","dbEditCP");
formWrite("","hidden","vid",$_REQUEST['vid']);
formWrite("","hidden","pid",$nQuery['id']);
formWrite("","hidden","nid",$notes['id']);
formWrite("","hidden","rid",$_REQUEST['id']);

echo '<div id="_ptwr">';
echo '<div style="float:left;width:312px;">';
form_ActiveDiagnosis($nQuery['id']);
form_PastMedicalHistory($nQuery['id']);
echo '</div>';


echo '<div style="float:left;">';
echo '<label for="_flow" class="nLabel">Patient information</label><br />';
echo '<fieldset name="_flow" class="_refborder" style="width:282px;">';

//Resus
echo '<div style="float:left;">';
echo '<label for="triage" class="nLabel">Resuscitate</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseDNAR as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="resus%s" name="resus" /><label for="resus%s">%s</label>',
				$nQuery['dnar'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";
//NLD
echo '<div style="float:left;">';
echo '<label for="nld" class="nLabel">Nurse discharge</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseNLD as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="nld%s" name="nld" /><label for="nld%s">%s</label>',
				$query['nld'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";

//Board
echo '<div style="float:left;">';
echo '<label for="triage" class="nLabel">Boardable</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseBoard as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="board%s" name="board" /><label for="board%s">%s</label>',
				$query['board'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";

//Whiteboard
echo '<div style="float:left;">';
echo '<label for="alert" class="nLabel">Whiteboard alert</label><br />';
printf ('<input name="alert" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="alert" value="%s"/>',$query['alert']);
echo	"</div>";

echo '</fieldset>';

echo '<label for="_flow2" class="nLabel">Flow control</label><br />';
echo '<fieldset name="_flow2" class="_refborder" style="width:282px;">';

echo '<div style="float:left;xwidth:300px;">';
//Consultant
echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Consultant</label><br />';
printf(	'<div class="_noselect patient-consultants-oc" id="_patient-consultants-oc">%s</div>',  $query['consoc'] == 0 ? 'Not set' :  $consultantsOncall[$query['site']][$query['consoc']]	);
printf( '<input type="hidden" value="%s" id="_patient-consultants-oc-code" name="patient-consultants-oc-code" />', $query['consoc'] == 0 ? 0 : $query['consoc']);
echo '</div>';
//MAU Consultant
echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">AMU Consultant</label><br />';
printf(	'<div class="_noselect patient-consultants-mau" id="_patient-consultants-mau">%s</div>', $query['consmau'] == 0 ? 'Not set' : $consultantsMAU[$query['site']][$query['consmau']]	);
printf( '<input type="hidden" value="%s" id="_patient-consultants-mau-code" name="patient-consultants-mau-code" />', $query['consmau'] == 0 ? 0 : $query['consmau']);
echo '</div>';
echo '</div>';
echo '<div style="float:left;width:300px;">';
//Suggested ward

switch ($query['sugward']):
	case 0:
	$_sugname = 'Not set';
	break;
	case 126:
	$_sugname = 'Discharge';
	break;
	case 127:
	$_sugname = 'Any medical ward';
	break;
	default:
	$_sugname = $baseWards[$query['site']][$query['sugward']][0];
	break;
endswitch;

echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Suggested ward</label><br />';
printf(	'<div class="_noselect suggested-ward" id="_suggested-ward">%s</div>', $_sugname	);
printf( '<input type="hidden" value="%s" id="_suggested-ward-code" name="suggested-ward-code" />', $query['sugward']);
echo '</div>';
echo '</div>';

echo '<div style="float:left;xwidth:300px;">';
//EDD
echo '<div style="float:left;">';
echo '<label for="edd" class="nLabel">Estimated Date of Discharge</label><br />';
echo '<div class="dialogButtons">';

printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd1" name="edd" data-date="%s" />',
$query['edd'] == date("Y-m-d") ? 'checked="checked" ':""        ,date("Y-m-d"),date("d/m/Y"));

echo 		 '<label for="edd1">Today</label>';

printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd2" name="edd" data-date="%s" />',
$query['edd'] == date("Y-m-d",strtotime("+1 day")) ? 'checked="checked" ':"",date("Y-m-d",strtotime("+1 day")),date("d/m/Y",strtotime("+1 day")));

printf 		('<label for="edd2">%s</label>',date("D",strtotime("+1 day")));

printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd3" name="edd" data-date="%s" />',
$query['edd'] == date("Y-m-d",strtotime("+2 day")) ? 'checked="checked" ':"",date("Y-m-d",strtotime("+2 day")),date("d/m/Y",strtotime("+2 day")));

printf 		('<label for="edd3">%s</label>',date("D",strtotime("+2 day")));

// printf		('<input type="radio" value="%s" id="edd0" name="edd" />',0);
//printf 		('<label for="edd0">→</label>');

echo '</div>';
echo "</div>";
echo '<div style="float:left;">';
echo '<label for="eddd" class="nLabel"></label><br />';
@printf ('<input name="eddd" style="width:100px;" class="validate[required,custom[trakEDD]] eddDate ui-button ui-widget ui-corner-all" type="text" id="eddd" value="%s"/>',$query['edd'] == (string) "0000-00-00" ? "" : date("d/m/Y",strtotime($query['edd'])));
echo "</div>";
echo '</div>';

// Shim:
// Old entries use status == 0 == 1
if ( $ref['status'] == '0' ) { $ref['status'] = '1'; };
printf( '<input type="hidden" data-text="%s" value="%s" id="_patient-status-code" name="patient-status-code" />', $refStatus[$ref['status']], $ref['status']);

echo '</fieldset>';
echo '</div>';

echo '</div>'; // ptwr

echo '</form>';


//printf ('<form id="_formnld">');
//form_nld($notes);

echo '<form id="_formnld">';
echo '<div id="_nldd" style="display:none;margin-left:100px;">';


form_nld($notes);
//echo '</form>';
//echo '</div>';




//Pathway
echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Ambulatory pathway</label><br />';
printf(	'<div class="_noselect patient-pathway" id="_patient-pathway">%s</div>', $query['pathway'] == 0 ? 'Inpatient' : $basePathway[$query['pathway']][0]	);
//printf(	'<div class="_noselect pathway-doc" id="_pathway-doc" data-url="%s">&nbsp;</div>', $query['pathway'] == 0 ? '' : $basePathway[$query['pathway']][1]	);
printf( '<input type="hidden" value="%s" id="_patient-pathway-code" name="patient-pathway-code" />', $query['pathway'] == 0 ? '0' : $query['pathway']);
echo '</div>';







echo '</div>'; // nldd

echo <<<HTML
			
</form>
<script type="text/javascript">
 $(function() {
	 $('.ui-dialog-buttonpane').prepend('{$icon}');
 });
</script>
HTML;






break;
};
case "formEditDoc":{ // Doc

// id, vid, type
		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;
		
$query = dbGet("mau_visit",$_REQUEST['vid']);
$nQuery = dbGet("mau_patient",$query['patient']);
$icon = sprintf ('<div style="float:left;padding:6px 0 0 8px;"><img border="0" width="32" height="32" src="gfx/%s" /></div>',$baseAuthorRole[1][1]);
$notes = dbGetByVisit('mau_data',$_REQUEST['vid']);
$ref    = dbGet("mau_referral",$_REQUEST['id']);

printf ('<form id="formEditDoc" action="http:/'.HOST.'/index.php" method="post">');
formWrite("","hidden","act","dbEditDoc");
formWrite("","hidden","vid",$_REQUEST['vid']);
formWrite("","hidden","pid",$nQuery['id']);
formWrite("","hidden","nid",$notes['id']);
formWrite("","hidden","rid",$_REQUEST['id']);

echo '<div style="float:left;width:312px;">';
form_ActiveDiagnosis($nQuery['id']);
form_PastMedicalHistory($nQuery['id']);

//Whiteboard
echo '<div style="float:left;">';
echo '<label for="alert" class="nLabel">Whiteboard alert</label><br />';
printf ('<input style="width:300px;" name="alert" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="alert" value="%s"/>',$query['alert']);
echo	"</div>";

echo '</div>';


echo '<div style="float:left;">';
echo '<label for="_flow" class="nLabel">Patient information</label><br />';
echo '<fieldset name="_flow" class="_refborder" style="width:282px;">';

//Resus
// echo '<div style="float:left;">';
// echo '<label for="triage" class="nLabel">Resuscitate</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($baseDNAR as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" id="resus%s" name="resus" /><label for="resus%s">%s</label>',
// 				$nQuery['dnar'] == $k ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v);};
// echo	"</div>";
// echo	"</div>";
//NLD
// echo '<div style="float:left;">';
// echo '<label for="triage" class="nLabel">Nurse discharge</label><br />';
// echo	'<div class="dialogButtons">';
// foreach ($baseNLD as $k => $v) {
// 	printf	('<input %svalue="%s" type="radio" id="nld%s" name="nld" /><label for="nld%s">%s</label>',
// 				$query['nld'] == $k ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v);};
// echo	"</div>";
// echo	"</div>";

//Board
echo '<div style="float:left;">';
echo '<label for="triage" class="nLabel">Boardable</label><br />';
echo	'<div class="dialogButtons">';
foreach ($baseBoard as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="board%s" name="board" /><label for="board%s">%s</label>',
				$query['board'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";

//End of the bed test
echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Clinical risk</label><br />';
printf(	'<div class="_noselect patient-eotbt" id="_patient-eotbt">%s</div>', $query['eotbt'] == 0 ? 'Not set' : $baseEOTBT[$query['eotbt']]	);
printf( '<input type="hidden" value="%s" id="_patient-eotbt-code" name="patient-eotbt-code" />', $query['eotbt'] == 0 ? '0' : $query['eotbt']);
echo '</div>';

//Pathway
echo '<div style="float:left;">';
echo '<label for="_conButton" class="nLabel">Ambulatory pathway</label><br />';
printf(	'<div class="_noselect patient-pathway" id="_patient-pathway">%s</div>', $query['pathway'] == 0 ? 'Inpatient' : $basePathway[$query['pathway']][0]	);
//printf(	'<div class="_noselect pathway-doc" id="_pathway-doc" data-url="%s">&nbsp;</div>', $query['pathway'] == 0 ? '' : $basePathway[$query['pathway']][1]	);
printf( '<input type="hidden" value="%s" id="_patient-pathway-code" name="patient-pathway-code" />', $query['pathway'] == 0 ? '0' : $query['pathway']);
echo '</div>';






echo '</fieldset>';

echo '<label for="_flow2" class="nLabel">Continuity</label><br />';
echo '<fieldset name="_ho" class="_refborder" style="width:282px;">';

// echo '<div style="float:left;xwidth:300px;">';
// //Consultant
// echo '<div style="float:left;">';
// echo '<label for="_conButton" class="nLabel">Consultant</label><br />';
// printf(	'<div class="_noselect patient-consultants-oc" id="_patient-consultants-oc">%s</div>',  $query['consoc'] == 0 ? 'Not set' :  $consultantsOncall[$query['site']][$query['consoc']]	);
// printf( '<input type="hidden" value="%s" id="_patient-consultants-oc-code" name="patient-consultants-oc-code" />', $query['consoc'] == 0 ? 0 : $query['consoc']);
// echo '</div>';
// //MAU Consultant
// echo '<div style="float:left;">';
// echo '<label for="_conButton" class="nLabel">MAU Consultant</label><br />';
// printf(	'<div class="_noselect patient-consultants-mau" id="_patient-consultants-mau">%s</div>', $query['consmau'] == 0 ? 'Not set' : $consultantsMAU[$query['site']][$query['consmau']]	);
// printf( '<input type="hidden" value="%s" id="_patient-consultants-mau-code" name="patient-consultants-mau-code" />', $query['consmau'] == 0 ? 0 : $query['consmau']);
// echo '</div>';
// echo '</div>';
// echo '<div style="float:left;width:300px;">';
// //Suggested ward
// echo '<div style="float:left;">';
// echo '<label for="_conButton" class="nLabel">Suggested ward</label><br />';
// printf(	'<div class="_noselect suggested-ward" id="_suggested-ward">%s</div>', $query['sugward'] == 0 ? 'Not set' : $baseWards[$query['site']][$query['sugward']][0]	);
// printf( '<input type="hidden" value="%s" id="_suggested-ward-code" name="suggested-ward-code" />', $query['sugward'] == 0 ? '0' : $query['sugward']);
// echo '</div>';
// echo '</div>';
// 
// echo '<div style="float:left;xwidth:300px;">';
// //EDD
// echo '<div style="float:left;">';
// echo '<label for="edd" class="nLabel">Estimated Date of Discharge</label><br />';
// echo '<div class="dialogButtons">';
// 
// printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd1" name="edd" data-date="%s" />',
// $query['edd'] == date("Y-m-d") ? 'checked="checked" ':""        ,date("Y-m-d"),date("d/m/Y"));
// 
// echo 		 '<label for="edd1">Today</label>';
// 
// printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd2" name="edd" data-date="%s" />',
// $query['edd'] == date("Y-m-d",strtotime("+1 day")) ? 'checked="checked" ':"",date("Y-m-d",strtotime("+1 day")),date("d/m/Y",strtotime("+1 day")));
// 
// printf 		('<label for="edd2">%s</label>',date("D",strtotime("+1 day")));
// 
// printf		('<input %sclass="eddButton" type="radio" value="%s" id="edd3" name="edd" data-date="%s" />',
// $query['edd'] == date("Y-m-d",strtotime("+2 day")) ? 'checked="checked" ':"",date("Y-m-d",strtotime("+2 day")),date("d/m/Y",strtotime("+2 day")));
// 
// printf 		('<label for="edd3">%s</label>',date("D",strtotime("+2 day")));
// 
// // printf		('<input type="radio" value="%s" id="edd0" name="edd" />',0);
// //printf 		('<label for="edd0">→</label>');
// 
// echo '</div>';
// echo "</div>";
// echo '<div style="float:left;">';
// echo '<label for="eddd" class="nLabel"></label><br />';
// @printf ('<input name="eddd" style="width:100px;" class="validate[required,custom[trakEDD]] eddDate ui-button ui-widget ui-corner-all" type="text" id="eddd" value="%s"/>',$query['edd'] == (string) "0000-00-00" ? "" : date("d/m/Y",strtotime($query['edd'])));
// echo "</div>";
// echo '</div>';

//Handover?
echo '<div style="float:left;">';
echo '<label for="ho" class="nLabel">Handover</label><br />';
echo	'<div class="dialogButtons">';



if ( strtotime($query['handate']) < time() )
{
	$query['handover'] = 0;
};


foreach ($baseHandover as $k => $v) {
	printf	('<input %svalue="%s" type="radio" id="ho%s" name="ho" /><label for="ho%s">%s</label>',
				$query['handover'] == $k ? 'checked="checked" ' : "",
				$k,$k,$k,$v);};
echo	"</div>";
echo	"</div>";


//Expire?
echo '<div style="float:left;">';
echo '<label for="edd" class="nLabel">Expire listing on</label><br />';
echo '<div class="dialogButtons">';

// Plan
//
// Su		Tomorrow +2 +3
// MTuW		Tomorrow +2 +3
// Th		Tomorrow M
// Sa		Tomorrow M
// F		Tomorrow +2 +3
// 
// < 10:00 today





// if (date('G') < 10) {
// 
// printf		('<input class="eddButton" type="radio" value="%s" id="edd1" name="edd" %s/>',
// date("Y-m-d"), $query['handate'] == date("Y-m-d") ? 'checked="checked" ' : '' );
// //echo 		 '<label for="edd1">Today</label>';
// printf 		('<label for="edd1">%s</label>',date("D"));
// };

$_dateSize = 3;
if (date('G') < 11) {
printf		('<input class="eddButton" type="radio" value="%s" id="edd1" name="edd" %s/>',
date("Y-m-d"), date("Y-m-d",strtotime($query['handate'])) == date("Y-m-d") ? 'checked="checked" ' : '' );
printf 		('<label for="edd1">%s</label>',substr(date("D"), 0, 2));
$_dateSize = 2;
};

printf		('<input class="eddButton" type="radio" value="%s" id="edd2" name="edd" %s/>',
date("Y-m-d",strtotime("+1 day")), date("Y-m-d",strtotime($query['handate'])) == date("Y-m-d",strtotime("+1 day")) ? 'checked="checked" ' : '' );
printf 		('<label for="edd2">%s</label>',substr(date("D",strtotime("+1 day")),0,$_dateSize));

// +2 +3 Su M Tu W F
if (in_array(date('N'),array(1,2,3,5,7))) {
printf		('<input class="eddButton" type="radio" value="%s" id="edd3" name="edd" %s/>',
date("Y-m-d",strtotime("+2 day")), date("Y-m-d",strtotime($query['handate'])) == date("Y-m-d",strtotime("+2 day")) ? 'checked="checked" ' : '');
printf 		('<label for="edd3">%s</label>',substr(date("D",strtotime("+2 day")),0,$_dateSize));

printf		('<input class="eddButton" type="radio" value="%s" id="edd4" name="edd" %s/>',
date("Y-m-d",strtotime("+3 day")), date("Y-m-d",strtotime($query['handate'])) == date("Y-m-d",strtotime("+3 day")) ? 'checked="checked" ' : '');
printf 		('<label for="edd4">%s</label>',substr(date("D",strtotime("+3 day")),0,$_dateSize));
};

// next Monday
if (in_array(date('N'),array(4,6))) {
printf		('<input class="eddButton" type="radio" value="%s" id="edd5" name="edd" %s/>',
date("Y-m-d",strtotime("next Monday")), date("Y-m-d",strtotime($query['handate'])) == date("Y-m-d",strtotime("next Monday")) ? 'checked="checked" ' : '');
printf 		('<label for="edd5">%s</label>',substr(date("D",strtotime("next Monday")),0,$_dateSize));
};

echo '</div>';
echo "</div>";


echo '<div style="float:left;">';
echo '<label for="plan" class="nLabel">Details</label><br />';
echo '<div id="_hopaper" class="notePaper" style="float:left;width:280px;"><div class="_smaller" style="height:120px;">';

//echo '<div style="float:left;">'; 

printf ('<textarea class="_smallNote" name="hodetails" type="text" id="hodetails" >%s</textarea>',$__AES->encrypt($notes['handovertxt'] , $__PW, 256));
//echo "</div>";

echo '</div></div></div>';







// Shim:
// Old entries use status == 0 == 1
if ( $ref['status'] == '0' ) { $ref['status'] = '1'; };
printf( '<input type="hidden" data-text="%s" value="%s" id="_patient-status-code" name="patient-status-code" />', $refStatus[$ref['status']], $ref['status']);

echo '</fieldset>';
echo '</div>';



echo <<<HTML
			
</form>
<script type="text/javascript">
 $(function() {
	 $('.ui-dialog-buttonpane').prepend('{$icon}');
 });
</script>
HTML;






break;
};
case "formAddJob":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;
		
// mau_events
	if ($_REQUEST['eid'] > 0) {
		$query = dbGet("mau_events",$_REQUEST['eid']);
		$map = array(
				 'id'      			=> $query['id'],
				 'event_start' 		=> $query['event_start'],
				 'event_end'    	=> $query['event_end'],
				 'event_text' 		=> $query['event_text'],
				 'event_location'	=> $query['event_location'],
				 'type'				=> $query['type'],
				 'event_porter'		=> $query['event_porter'],
				 'pID'				=> $query['pID'],
				 'vID'				=> $query['vID'],
				 'status'			=> $query['status'],
				 
				 'event_date'		=> date( 'd/m/Y', strtotime($query['event_start']) ),
				 'event_time'		=> date( 'H:i', strtotime($query['event_start']) ),
				 'event_desc'		=> $query['event_desc'],
				 'event_result'		=> $query['event_result'],
				 'event_data'		=> $query['event_data'],
				 'extras'			=> $query['extras']
				 );
	} else {
		$map = array(
				 'id'      			=> "",
				 'event_start' 		=> "",
				 'event_end'    	=> "",
				 'event_text' 		=> "",
				 'event_location'	=> "",
				 'type'				=> "",
				 'event_porter'		=> "",
				 'pID'				=> $_REQUEST['pid'],
				 'vID'				=> $_REQUEST['vid'],
				 'status'			=> "1",
				 
				 'event_date'		=> date( 'd/m/Y', time() ),
				 'event_time'		=> date( 'H:i', time() ),
				 'event_desc'		=> "",
				 'event_result'		=> "",
				 'event_data'		=> '',
				 'extras'		=> ''
				);	
	};


echo '<div id="_jobdata"><div style="float:left;width:360px;">';

//Job
if ($map['type'] != "") {
	printf ('<form id="addJob" data-desc="%s">',$jobType[$map['type']][0]);
}
else
{
	printf ('<form id="addJob" data-desc="">');
};
echo '<input type="hidden" name="act" value="dbAddJob" />';
printf ('<input name="id" type="hidden" id="id" value="%s"/>', $map['id']);
printf ('<input name="pID" type="hidden" id="pID" value="%s"/>', $map['pID']);
printf ('<input name="vID" type="hidden" id="vID" value="%s"/>', $map['vID']);
printf ('<input name="statusSum" type="hidden" id="statusSum" value="%s"/>', $map['status']);
printf ('<input name="event_text" type="hidden" id="event_text" value="%s"/>', $map['event_text']);
// Internally this will be changed to +5 minutes
printf ('<input name="event_end" type="hidden" id="event_end" value="%s"/>', $map['event_start']);

echo '<div style="float:left;">';
echo '<label for="event_date" class="nLabel">Date</label><br />';
printf ('<input name="event_date" class="validate[required,custom[trakDOB]] ui-button ui-widget ui-corner-all noteAuthorField _dateBox" type="text" id="event_date" value="%s"/>',
		$map['event_date']);
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="event_time" class="nLabel">Time</label><br />';
printf ('<input name="event_time" class="validate[required,custom[trakTime]] ui-button ui-widget ui-corner-all noteAuthorField _timeBox" type="text" id="event_time" value="%s"/>',
		$map['event_time']);
echo "</div>";

//printf ('<input name="event_start" class="ui-button ui-widget ui-corner-all noteAuthorField" type="text" id="event_start" value="%s"/>',
//		$map['event_start']);


// echo '<div style="float:left;">';
// echo '<label for="event_end" class="nLabel">Event end</label><br />';
// printf ('<input name="event_end" class="ui-button ui-widget ui-corner-all noteAuthorField" type="text" id="event_end" value="%s"/>',
// 		$map['event_end']);
// echo "</div>";

// echo '<div style="float:left;">';
// echo '<label for="event_text" class="nLabel">Event text</label><br />';
// printf ('<input name="event_text" class="ui-button ui-widget ui-corner-all noteAuthorField" type="text" id="event_text" value="%s"/>',
// 		$map['event_text']);
// echo "</div>";

echo '<div style="float:left;">';
echo '<label for="event_location" class="nLabel">Location</label><br />';
printf ('<input style="width:182px;" name="event_location" class="ui-button ui-widget ui-corner-all noteAuthorField" type="text" id="event_location" value="%s"/>',
		$map['event_location']);
echo "</div>";

// echo '<div style="float:left;">';
// echo '<label for="type" class="nLabel">Type</label><br />';
// printf ('<input name="type" class="ui-button ui-widget ui-corner-all noteAuthorField" type="text" id="type" value="%s"/>',
// 		$map['type']);
// echo "</div>";

echo '<div style="float:left;">';
//echo '<label for="event_porter" class="nLabel">Porter</label><br />';
printf ('<input name="event_porter" class="ui-button ui-widget ui-corner-all noteAuthorField" type="hidden" id="event_porter" value="%s"/>',
		$map['event_porter']);
echo "</div>";

echo '<div style="float:left;">';
echo '<label for="type" class="nLabel">Job type<span id="_jobDesc"></span></label><br />';
echo	'<div class="dialogButtons" id="jobButtons">';
foreach ($jobType as $key => $who) {
 printf ('<input %s type="radio" value="%s" id="job%s" name="type" class="validate[required,groupRequired[jobType]]" />',
 $map['type'] == $key ? 'checked="checked"' : "",
 $key,$key);
 printf ('<label for="job%s"><img src="%s" width="38" height="38" data-desc="%s" data-type="%s" /></label>',$key,$who[1],$who[0],$key);
};
echo	"</div>";
echo "</div>";

echo '<br clear="both">';
echo '<span class="nLabel">Notes</span><br />';
echo '<div class="notePaper" style="width:360px;"><div class="_small">';


// $__AES->encrypt($map['event_desc'] , $__PW, 256)
// printf ('<textarea name="event_desc" class="_smallNote">%s</textarea>',$map['event_desc']);
printf ('<textarea name="event_desc" class="_smallNote">%s</textarea>',$__AES->encrypt($map['event_desc'] , $__PW, 256));

echo '</div></div>';

// echo '<div style="float:left;">';
// echo '<label for="status" class="nLabel">Job status</label><br />';
// echo	'<div class="dialogButtons" id="statusButtons">';
// foreach ($jobStatus as $k => $v) {
// 	$_checked = $map['status'] & $k;
// 	printf	('<input %svalue="%s" class="validate[required,groupRequired[jobStat]]" type="radio" id="status%s" name="status" /><label for="status%s">%s</label>',
// 				$_checked ? 'checked="checked" ' : "",
// 				$k,$k,$k,$v);
// };
// echo	"</div>";
// echo "</div>";

printf( '<input type="hidden" data-text="%s" value="%s" id="_patient-jobstatus-code" name="patient-jobstatus-code" />', $jobStatus[$map['status']], $map['status']);


echo '</form>';
echo '</div>';

echo '<div style="float:left;width:320px;height:480px;margin-left:4px;">';

// Investigation
//echo '<div class="patient-job-subtype">Add an investigation</div>';

	echo '<div style="float:left;">';
	echo '<label style="padding-left:3px;margin-left:1px;" class="nLabel">Investigations';
//	echo ' <span class="patient-job-subtype">Add</span>';
	echo '</label><br />';
	echo '<form id="joblist"><fieldset id="ixlist" class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="overflow-y:auto;overflow-x:hidden;width:300px;height:170px;">';


$_data = json_decode($map['event_data'],$assoc = true);
if (isset($_data['ixid'])) {
foreach ($_data['ixid'] as $k => $v) {

printf('<div data-id="%s" class="_cond hdrWideButtons23">%s<a class="_R" href="#">✕</a>',$v,$jobType[$map['type']][2][$v]);
printf('<input type="hidden" name="ixid" value="%s"><input type="hidden" name="ixres" value="%s"><input type="hidden" name="ixtxt" value="%s">',$v,  urldecode($_data['ixres'][$k])  ,$jobType[$map['type']][2][$v]);
echo '</div>';
};
};

	echo '</fieldset></form>';
	echo '</div>';



// End: new


// echo <<<HTML
// <div class="patient-job-subtype">Add an investigation</div>
// <form id="joblist">
// <div class="scrapPaper" style="width:320px;height:261px;margin-top:4px;">
// <img src="gfx/paper-clip-mini.png" style="margin-top:-2px;margin-left:4px;float:left;" />
// <div class="_small" style="float:left;">
// HTML;
// 
// $_data = json_decode($map['event_data'],$assoc = true);
// if (isset($_data['ixid'])) {
// foreach ($_data['ixid'] as $k => $v) {
// 	printf ('<div %sclass="hdrWideButtons23" data-id="%s"><input type="hidden" name="ixid" value="%s"><input type="hidden" name="ixres" value="%s"><input type="hidden" name="ixtxt" value="%s">%s</div>',
// 	isset($jobType[$map['type']][3]) ? 'style="width:'. $jobType[$map['type']][3] .'px;" ' : 'style="width:80px;" ',
// 	$v,$v,  urldecode($_data['ixres'][$k])  ,$jobType[$map['type']][2][$v],$jobType[$map['type']][2][$v]);
// };
// };

// End: investigation





//echo '</div></div></form>';




// Special
// Variant is found in ajax->jobextras and formAddJob
$_extras = json_decode($map['extras'],$assoc = true);
echo '<div id="_el"><form id="extraslist">';
if ($map['type'] != '') {
foreach ($jobType[$map['type']][4] as $key => $value) {

	// If a new extras array key doesn't (yet) exist in the database, set the value to
	// the first key of the array of options as the default
	if (!isset($_extras[$key][0])) {
		$_extras[$key][0] = current(array_keys($value));
	};
	echo '<div style="float:left;">';
	printf ('<label for="type" class="nLabel">%s</label><br />',str_replace('_',' ',$key));
	echo	'<div class="dialogButtons">';
	foreach($value as $_loop => $option) {

		printf ('<input %s type="radio" value="%s" id="%s%s" name="%s">',
			$_extras[$key][0] == $_loop ? 'checked="checked"' : '',
			$_loop,$key,$_loop,$key
			);
		printf ('<label for="%s%s">%s</label>',
			$key,$_loop,$option
			);

	};
	echo "</div>";
	echo "</div>";

};
};
echo '</form></div>';
// End:Special



echo '</div>';

echo '</div>'; // _jobdata

echo '<form id="addJobResult" style="display:none;">';

echo '<span class="nLabel">Results</span><br />';
echo '<div class="notePaper" style="width:360px;"><div class="_medium">';

// $__AES->encrypt($map['event_result'] , $__PW, 256)
// printf ('<textarea name="event_result" class="_smallNote">%s</textarea>',$map['event_result']);
printf ('<textarea name="event_result" class="_smallNote">%s</textarea>',$__AES->encrypt($map['event_result'] , $__PW, 256));

echo '</div></div>';

echo '</form>';



break;
};
case "formEditDemo":{

		require_once 'lib/AES/aes.class.php';     // AES PHP implementation
		require_once 'lib/AES/aesctr.class.php';  // AES Counter Mode implementation 
		global $__PW; $__AES  = new AesCtr;

$query = dbGet("mau_visit",$_REQUEST['vid']);
$nQuery = dbGet("mau_patient",$query['patient']);

//$nQuery = dbGet("mau_patient",$_REQUEST['pid']);

printf ('<form id="formEditDemo" action="http:/'.HOST.'/index.php" method="post">');
formWrite("","hidden","act","dbEditDemo");
formWrite("","hidden","pid",$nQuery['id']);
formWrite("","hidden","vid",$_REQUEST['vid']);

//echo '<fieldset name="_pat" class="_refborder" style="width:312px;">';

echo '<div style="float:left;width:154px;">';

echo '<div style="float:left;">';
echo '<label for="name" class="nLabel">Patient name</label><br />';
printf ('<input name="pname" class="ui-widget ui-state-default ui-corner-all noteAuthorField" style="width:140px;" type="text" id="pname" value="%s"/>',$__AES->encrypt($nQuery['name'] , $__PW, 256));
echo '</div>';
echo '<div style="float:left;">';
echo '<label for="paddress" class="nLabel">Patient address</label><br />';
printf ('<textarea class="ui-widget ui-state-default ui-corner-all SBARfield" style="width:140px;" name="paddress" type="text" id="paddress" >%s</textarea>',$__AES->encrypt($nQuery['paddr'] , $__PW, 256));
echo '</div>';
echo '<div style="float:left;">';
echo '<label for="gender" class="nLabel">Gender</label><br />';
echo	'<div class="dialogButtons">';
printf(		'<input %sclass="validate[required,groupRequired[gender]]" type="radio" value="1" id="patSex1" name="gender" /><label for="patSex1">Male</label>' , $nQuery['gender']==1?'checked="checked" ':''   );
printf(		'<input %sclass="validate[required,groupRequired[gender]]" type="radio" value="0" id="patSex0" name="gender" /><label for="patSex0">Female</label>' , $nQuery['gender']==0?'checked="checked" ':''  );
echo	"</div>";
echo "</div>";
echo '<div style="float:left;">';
echo '<label for="dob" class="nLabel">Date of birth</label><br />';
printf ('<input name="dob" class="ui-widget ui-state-default ui-corner-all noteAuthorField" style="width:140px;" type="text" id="dob" value="%s"/>',date( 'd/m/Y', strtotime($nQuery['dob']) ) );
echo '</div>';

echo '</div>';


echo '<div style="float:left;width:154px;">';


echo '<div style="float:left;">';
echo '<label for="gpname" class="nLabel">GP name</label><br />';
printf ('<input name="gpname" class="ui-widget ui-state-default ui-corner-all noteAuthorField" style="width:140px;" type="text" id="gpname" value="%s"/>',$nQuery['gpname']);
echo '</div>';
echo '<div style="float:left;">';
echo '<label for="gpaddress" class="nLabel">GP address</label><br />';
printf ('<textarea class="ui-widget ui-state-default ui-corner-all SBARfield" style="width:140px;" name="gpaddress" type="text" id="gpaddress" >%s</textarea>',$nQuery['gpaddr']);
echo '</div>';
echo '<div style="float:left;">';
echo '<label for="pas" class="nLabel">PAS number</label><br />';
printf ('<input maxlength="8" name="pas" class="ui-widget ui-state-default ui-corner-all noteAuthorField" style="width:140px;" type="text" id="pas" value="%s"/>',$nQuery['pas']);
echo '</div>';
echo '<div style="float:left;">';
echo '<label for="nhs" class="nLabel">NHS number</label><br />';
printf ('<input maxlength="10" name="nhs" class="ui-widget ui-state-default ui-corner-all noteAuthorField" style="width:140px;" type="text" id="nhs" value="%s"/>',$nQuery['nhs']);
echo '</div>';





echo '</div>';

//echo '</fieldset>';
echo '</form>';
break;
};
case "document":{

//include_once "lib/Barcode39.php";
include_once "lib/php-barcode-2.0.1.php";

switch ($_REQUEST['type']):
case '1': // Clerking document
{

	$sql = sprintf ("	SELECT * FROM mau_patient pat, mau_visit vis
						WHERE vis.id='%s'
						AND pat.id = vis.patient
						LIMIT 1",
					mysql_real_escape_string($_REQUEST['vid']));
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
  	  echo 'Could not run query: ' . mysql_error();
  	  exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
			$data[] = array(
		
						'Name'			=>	strtoupper($_visit['name']),
						'DOB'			=>	date("d/m/Y",strtotime($_visit['dob'])),
						'Age'			=>	years_old($_visit['dob']),
						'NHS'			=>	'000 000 0000',
						'PAS'			=>	$_visit['pas'],
						'AdmitDate'		=>	date("l d/m/Y",strtotime($_visit['admitdate'])),
						'FullAdmitDate'	=>	date("d/m/Y g:i a",strtotime($_visit['admitdate']))
						
						);
			mergeDocument(0,"tpl/mau.xml.docx",'trakImported',$data,"cache/mau_" . str_replace(' ', '', $_visit['name']) . ".docx");	
		};
	};
	break;
};
case '2': // Discharge document
{

	$sql = sprintf ("	SELECT * FROM mau_patient pat, mau_visit vis
						WHERE vis.id='%s'
						AND pat.id = vis.patient
						LIMIT 1",
					mysql_real_escape_string($_REQUEST['vid']));
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
  	  echo 'Could not run query: ' . mysql_error();
  	  exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
			$_notes = dbGetByVisit('mau_data',$_visit['id']);
			$_patient = dbGet('mau_patient',$_visit['patient']);
			$sql = sprintf(	"SELECT * FROM mau_activehx, med_activehx
					 WHERE patient = %s
					 AND mau_activehx.cond = med_activehx.id
					 ORDER BY mau_activehx.id;",
					 $_visit['patient']); $_ad = '';
			$adQuery = mysql_query($sql);
			if (!$adQuery) {
		echo 'Could not run query (disch_ActiveDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($adQuery) != 0) {

		while ($_ActiveDiagnosis = mysql_fetch_array($adQuery, MYSQL_ASSOC)) {
	
				$_ad .= $_ActiveDiagnosis['comorb'];
				$_ad .= '</w:t><w:br/><w:t>';
				
		};
		$_ad = substr($_ad,0,-18); // always remove the last </w:t><w:br/><w:t>
	};
			$sql = sprintf(	"SELECT * FROM mau_pmhx, med_pmhx
					 WHERE patient = %s
					 AND mau_pmhx.cond = med_pmhx.id
					 ORDER BY mau_pmhx.id;",
					 $_visit['patient']); $_pm = '';
			$pmQuery = mysql_query($sql);
			if (!$pmQuery) {
		echo 'Could not run query (disch_PMDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($pmQuery) != 0) {
				while ($_PMDiagnosis = mysql_fetch_array($pmQuery, MYSQL_ASSOC)) {
					$_pm .= $_PMDiagnosis['comorb'];
					$_pm .= '</w:t><w:br/><w:t>';
				};
				$_pm = substr($_pm,0,-18); // always remove the last </w:t><w:br/><w:t>
			};
			// $bc = new Barcode39($_visit['pas']);
			// $bc->draw(sprintf("/i-data/30dfda76/trak/cache/barcode/%s.gif",$_visit['pas']));
			$im     = imagecreate(150, 20);  
			$black  = ImageColorAllocate($im,0x00,0x00,0x00);  
			$white  = ImageColorAllocate($im,0xff,0xff,0xff);  
			imagefilledrectangle($im, 0, 0, 150, 20, $white);  
			$bc_data = Barcode::gd($im, $black, 100, 10, 0, "code128", $_visit['pas']); 
			imagegif($im, sprintf(dirname($_SERVER['SCRIPT_FILENAME'])."/cache/barcode/%s.gif",$_visit['pas']));
			$data[] = array(
		
				'name'		=>	strtoupper($_visit['name']),
				'addr'		=>	htmlspecialchars($_visit['paddr']),
				'adm'		=>	date("d/m/Y",strtotime($_visit['admitdate'])),
				'reason'	=>	htmlspecialchars($_notes['pc']),
				'admsrc'		=>	htmlspecialchars($baseSource[$_visit['source']][2]),
				'activeDx'	=>	$_ad,
				'pmHx'		=>	$_pm,
				'site'		=>	$baseSites[$_visit['site']][0],
				'ward'		=>	$baseWards[$_visit['site']][$_visit['ward']][0],
				'dob'		=>	date("d/m/Y",strtotime($_visit['dob'])),
				'pas'		=>	$_visit['pas'],
				'NHS'		=>	$_visit['nhs'],
				'gpaddr'	=>	htmlspecialchars($_visit['gpaddr']),
				'gpname'	=>	'Dr ' . $_visit['gpname'],
				'todaysDate'=>	date("D jS F Y"),
				'xconsoc'	=>	munge_consultantname($consultantsOncall[$_visit['site']][$_visit['consoc']]),
				'x-adm'		=> '10/06/2012',
				'disch'		=>	date("d/m/Y",strtotime($_visit['acdd'])),
				'src'		=>	$baseSites[$_visit['site']][1] . ' ' . $baseWards[$_visit['site']][$_visit['ward']][1],
				'ambulatory'	=> $_visit['pathway'] != 0 ? $basePathway[$_visit['pathway']][0] : 'None',
				'triage' 	=> trim( preg_replace( '/\s+/', ' ', $_notes['SBARs'] ) ),
				'barcode'	=>	sprintf(dirname($_SERVER['SCRIPT_FILENAME']).'/cache/barcode/%s.gif',$_visit['pas']),
				'ccom'		=>	htmlspecialchars($_notes['ccom']),
				'gpadv'		=>	htmlspecialchars($_notes['gpadv']),
				'rxchange'	=>	$_notes['rxchange'] == 1 ? 'Medication changes have been made and are detailed in the enclosed prescription chart.' : 'No medication changes have been made.',
				'dnar'		=>	$_patient['dnar'] == 1 ? 'Please consider implementing NHS EOLC/GSF guidelines for this patient in the coming weeks.':'',
				'dest'		=>	$dischargeDest[$_visit['ddest']],
				
'consoc' => $baseDefaultWards[$_visit['site']] == $_visit['ward'] ? munge_consultantname($consultantsMAU[$_visit['site']][$_visit['consmau']]) : munge_consultantname($consultantsOncall[$_visit['site']][$_visit['consoc']]),
						
			);
			$refQuery = mysql_query("SELECT * FROM mau_referral WHERE visitid=" . $_visit['id']);
			while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
				if (in_array($_referral['who'],array(1,2,5,18))) continue;
				$noteHx = dbGetNote($_referral['id'],NOTE_REFHX);
				$noteDx = dbGetNote($_referral['id'],NOTE_REFDX);
				$ref[] = array(
		'who'		=>	$baseAuthorRole[$_referral['who']][0],
		'referral'	=>	$noteHx['note'],
		'outcome'	=>	$noteDx['note']
	);
			};
			$sql = sprintf ("	SELECT * FROM mau_events
							WHERE mau_events.vid = %s
							AND status < 16;",
    					$_visit['id']);
			$jobsQuery = mysql_query($sql); if (!$jobsQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}
			while ($_job = mysql_fetch_array($jobsQuery, MYSQL_ASSOC)) {
				$job[]=array(

'type' => $jobType[$_job['type']][0],
'ref' => htmlspecialchars($_job['event_desc']),
'res' => htmlspecialchars($_job['event_result'])

);
			};
			if (!isset($ref)) {
				$ref[]=array('who'=>'No information','referral'=>'','outcome'=>'');
			};
			if (!isset($job)) {
				$job[]=array('type'=>'No information','ref'=>'','res'=>'');
			};
			mergeDocument(0,"tpl/discharge.xml.docx",'trakData',$data,"cache/discharge_" . date('U') . "_" . str_replace(' ', '', $_visit['name']) . ".docx",'trakRef',$ref,'trakJob',$job);	
		};
	};
	break;

};
case '3': // Progress notes
{

	$sql = sprintf ("	SELECT * FROM mau_patient pat, mau_visit vis
						WHERE vis.id='%s'
						AND pat.id = vis.patient
						LIMIT 1",
					mysql_real_escape_string($_REQUEST['vid']));
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
  	  echo 'Could not run query: ' . mysql_error();
  	  exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
			$_notes = dbGetByVisit('mau_data',$_visit['id']);
			$sql = sprintf(	"SELECT * FROM mau_activehx, med_activehx
					 WHERE patient = %s
					 AND mau_activehx.cond = med_activehx.id
					 ORDER BY mau_activehx.id;",
					 $_visit['patient']); $_ad = '';
			$adQuery = mysql_query($sql);
			if (!$adQuery) {
		echo 'Could not run query (disch_ActiveDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($adQuery) != 0) {

		while ($_ActiveDiagnosis = mysql_fetch_array($adQuery, MYSQL_ASSOC)) {
	
				$_ad .= $_ActiveDiagnosis['comorb'];
				$_ad .= '</w:t><w:br/><w:t>';
				
		};
		$_ad = substr($_ad,0,-18); // always remove the last </w:t><w:br/><w:t>
	};
			$sql = sprintf(	"SELECT * FROM mau_pmhx, med_pmhx
					 WHERE patient = %s
					 AND mau_pmhx.cond = med_pmhx.id
					 ORDER BY mau_pmhx.id;",
					 $_visit['patient']); $_pm = '';
			$pmQuery = mysql_query($sql);
			if (!$pmQuery) {
		echo 'Could not run query (disch_PMDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($pmQuery) != 0) {
				while ($_PMDiagnosis = mysql_fetch_array($pmQuery, MYSQL_ASSOC)) {
					$_pm .= $_PMDiagnosis['comorb'];
					$_pm .= '</w:t><w:br/><w:t>';
				};
				$_pm = substr($_pm,0,-18); // always remove the last </w:t><w:br/><w:t>
			};
			// $bc = new Barcode39($_visit['pas']);
			// $bc->draw(sprintf("/i-data/30dfda76/trak/cache/barcode/%s.gif",$_visit['pas']));
			$im     = imagecreate(150, 20);  
			$black  = ImageColorAllocate($im,0x00,0x00,0x00);  
			$white  = ImageColorAllocate($im,0xff,0xff,0xff);  
			imagefilledrectangle($im, 0, 0, 150, 20, $white);  
			$bc_data = Barcode::gd($im, $black, 100, 10, 0, "code128", $_visit['pas']); 
			imagegif($im, sprintf(dirname($_SERVER['SCRIPT_FILENAME'])."/cache/barcode/%s.gif",$_visit['pas']));
			$data[] = array(
		
				'name'		=>	strtoupper($_visit['name']),
				'addr'		=>	$_visit['paddr'],
				'adm'		=>	date("d/m/Y",strtotime($_visit['admitdate'])),
				'reason'	=>	$_notes['pc'],
				'admsrc'		=>	$baseSource[$_visit['source']][2],
				'activeDx'	=>	$_ad == '' ? 'No information' : $_ad,
				'pmHx'		=>	$_pm == '' ? 'No information' : $_pm,
				'site'		=>	$baseSites[$_visit['site']][0],
				'ward'		=>	$baseWards[$_visit['site']][$_visit['ward']][0],
				'dob'		=>	date("d/m/Y",strtotime($_visit['dob'])),
				'pas'		=>	$_visit['pas'],
				'NHS'		=>	$_visit['nhs'],
				'gpaddr'	=>	$_visit['gpaddr'],
				'gpname'	=>	'Dr ' . $_visit['gpname'],
				'todaysDate'=>	date("D jS F Y"),
				'consoc'	=>	$consultantsOncall[$_visit['site']][$_visit['consoc']],
				'x-adm'		=> '10/06/2012',
				'disch'		=>	'10/06/2013',
				'src'		=>	$baseSites[$_visit['site']][1] . ' ' . $baseWards[$_visit['site']][$_visit['ward']][1],
				'ambulatory'	=> $_visit['pathway'] != 0 ? $basePathway[$_visit['pathway']][0] : 'None',
				'triage' => trim( preg_replace( '/\s+/', ' ', $_notes['SBARs'] ) ),
				'barcode'=>	sprintf(dirname($_SERVER['SCRIPT_FILENAME']).'/cache/barcode/%s.gif',$_visit['pas'])

						
			);




			$refQuery = mysql_query("SELECT * FROM mau_referral WHERE visitid=" . $_visit['id']);
			while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
				if (in_array($_referral['who'],array(1,2,5,18))) continue;
				$noteHx = dbGetNote($_referral['id'],NOTE_REFHX);
				$noteDx = dbGetNote($_referral['id'],NOTE_REFDX);
				$ref[] = array(
		'who'		=>	$baseAuthorRole[$_referral['who']][0],
		'referral'	=>	$noteHx['note'],
		'outcome'	=>	$noteDx['note']
	);
			};
			$sql = sprintf ("	SELECT * FROM mau_events
							WHERE mau_events.vid = %s
							AND status < 16;",
    					$_visit['id']);
			$jobsQuery = mysql_query($sql); if (!$jobsQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}
			while ($_job = mysql_fetch_array($jobsQuery, MYSQL_ASSOC)) {
				$job[]=array(

'type' => $jobType[$_job['type']][0],
'ref' => htmlspecialchars($_job['event_desc']),
'res' => htmlspecialchars($_job['event_result'])

);
			};
			if (!isset($ref)) {
				$ref[]=array('who'=>'No information','referral'=>'','outcome'=>'');
			};
			if (!isset($job)) {
				$job[]=array('type'=>'No information','ref'=>'','res'=>'');
			};
			mergeDocument(0,"tpl/progress.xml.docx",'trakData',$data,"cache/discharge_" . date('U') . "_" . str_replace(' ', '', $_visit['name']) . ".docx",'trakRef',$ref,'trakJob',$job);	
		};
	};
	break;

};
case '4': // Patient information document
{

	$sql = sprintf ("	SELECT * FROM mau_patient pat, mau_visit vis
						WHERE vis.id='%s'
						AND pat.id = vis.patient
						LIMIT 1",
					mysql_real_escape_string($_REQUEST['vid']));
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
  	  echo 'Could not run query: ' . mysql_error();
  	  exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
			$_notes = dbGetByVisit('mau_data',$_visit['id']);
			$_patient = dbGet('mau_patient',$_visit['patient']);
			$sql = sprintf(	"SELECT * FROM mau_activehx, med_activehx
					 WHERE patient = %s
					 AND mau_activehx.cond = med_activehx.id
					 ORDER BY mau_activehx.id;",
					 $_visit['patient']); $_ad = '';
			$adQuery = mysql_query($sql);
			if (!$adQuery) {
		echo 'Could not run query (disch_ActiveDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($adQuery) != 0) {

		while ($_ActiveDiagnosis = mysql_fetch_array($adQuery, MYSQL_ASSOC)) {
	
				$_ad .= $_ActiveDiagnosis['comorb'];
				$_ad .= '</w:t><w:br/><w:t>';
				
		};
		$_ad = substr($_ad,0,-18); // always remove the last </w:t><w:br/><w:t>
	};
			$sql = sprintf(	"SELECT * FROM mau_pmhx, med_pmhx
					 WHERE patient = %s
					 AND mau_pmhx.cond = med_pmhx.id
					 ORDER BY mau_pmhx.id;",
					 $_visit['patient']); $_pm = '';
			$pmQuery = mysql_query($sql);
			if (!$pmQuery) {
		echo 'Could not run query (disch_PMDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($pmQuery) != 0) {
				while ($_PMDiagnosis = mysql_fetch_array($pmQuery, MYSQL_ASSOC)) {
					$_pm .= $_PMDiagnosis['comorb'];
					$_pm .= '</w:t><w:br/><w:t>';
				};
				$_pm = substr($_pm,0,-18); // always remove the last </w:t><w:br/><w:t>
			};
			// $bc = new Barcode39($_visit['pas']);
			// $bc->draw(sprintf("/i-data/30dfda76/trak/cache/barcode/%s.gif",$_visit['pas']));
			$im     = imagecreate(150, 20);  
			$black  = ImageColorAllocate($im,0x00,0x00,0x00);  
			$white  = ImageColorAllocate($im,0xff,0xff,0xff);  
			imagefilledrectangle($im, 0, 0, 150, 20, $white);  
			$bc_data = Barcode::gd($im, $black, 100, 10, 0, "code128", $_visit['pas']); 
			imagegif($im, sprintf(dirname($_SERVER['SCRIPT_FILENAME'])."/cache/barcode/%s.gif",$_visit['pas']));
			$data[] = array(
		
				'name'		=>	ucwords($_visit['name']),
				'honorific'	=>	$_visit['gender'] == 1 ? 'Mr':'Mrs',
				'addr'		=>	htmlspecialchars($_visit['paddr']),
				'adm'		=>	date("d/m/Y",strtotime($_visit['admitdate'])),
				'reason'	=>	htmlspecialchars($_notes['pc']),
				'admsrc'		=>	htmlspecialchars($baseSource[$_visit['source']][2]),
				'activeDx'	=>	$_ad,
				'pmHx'		=>	$_pm,
				'site'		=>	$baseSites[$_visit['site']][0],
				'ward'		=>	$baseWards[$_visit['site']][$_visit['ward']][0],
				'dob'		=>	date("d/m/Y",strtotime($_visit['dob'])),
				'pas'		=>	$_visit['pas'],
				'NHS'		=>	$_visit['nhs'],
				'gpaddr'	=>	htmlspecialchars($_visit['gpaddr']),
				'gpname'	=>	'Dr ' . $_visit['gpname'],
				'todaysDate'=>	date("l jS F Y"),
				'xconsoc'	=>	munge_consultantname($consultantsOncall[$_visit['site']][$_visit['consoc']]),
				'x-adm'		=> '10/06/2012',
				'disch'		=>	date("d/m/Y",strtotime($_visit['acdd'])),
				'src'		=>	$baseSites[$_visit['site']][0] . ' ' . $baseWards[$_visit['site']][$_visit['ward']][0],
				'ambulatory'	=> $_visit['pathway'] != 0 ? $basePathway[$_visit['pathway']][0] : 'Not applicable',
				'triage' 	=> trim( preg_replace( '/\s+/', ' ', $_notes['SBARs'] ) ),
				'barcode'	=>	sprintf(dirname($_SERVER['SCRIPT_FILENAME']).'/cache/barcode/%s.gif',$_visit['pas']),
				'ccom'		=>	htmlspecialchars($_notes['ccom']),
				'gpadv'		=>	htmlspecialchars($_notes['gpadv']),
				'patadv'		=>	htmlspecialchars($_notes['patadv']),
				'rxchange'	=>	$_notes['rxchange'] == 1 ? 'Some changes have been made to your prescription. The pharmacist has enclosed a list of your current medications with instructions for their use. Please study this carefully. ' : 'Your medication prescription has not changed. ',
				'dnar'		=>	$_patient['dnar'] == 1 ? 'Please consider implementing NHS EOLC/GSF guidelines for this patient in the coming weeks.':'',
				'dest'		=>	$dischargeDest[$_visit['ddest']],
				'ambu'	=> $_visit['pathway'] != 0 ? 'You have been discharged early as an \'ambulatory care\' patient registered on our virtual ward. This means you can receive hospital treatment but return home to your own bed at the end of the day. ' : '',
				
'consoc' => $baseDefaultWards[$_visit['site']] == $_visit['ward'] ? munge_consultantname($consultantsMAU[$_visit['site']][$_visit['consmau']]) : munge_consultantname($consultantsOncall[$_visit['site']][$_visit['consoc']]),
				'fup'	=> $_notes['followup'] != 0 ? $followupTypes[$_notes['followup']] : '',	
								'smward'		=>	$baseWards[$_visit['site']][$_visit['ward']][1],
				
									
			);
			$refQuery = mysql_query("SELECT * FROM mau_referral WHERE visitid=" . $_visit['id']);
			while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
				if (in_array($_referral['who'],array(1,2,5,18))) continue;
				$noteHx = dbGetNote($_referral['id'],NOTE_REFHX);
				$noteDx = dbGetNote($_referral['id'],NOTE_REFDX);
				$ref[] = array(
		'who'		=>	$baseAuthorRole[$_referral['who']][0],
		'referral'	=>	$noteHx['note'],
		'outcome'	=>	$noteDx['note']
	);
			};
			$sql = sprintf ("	SELECT * FROM mau_events
							WHERE mau_events.vid = %s
							AND status < 16;",
    					$_visit['id']);
			$jobsQuery = mysql_query($sql); if (!$jobsQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}
			while ($_job = mysql_fetch_array($jobsQuery, MYSQL_ASSOC)) {
				$job[]=array(

'type' => $jobType[$_job['type']][0],
'ref' => htmlspecialchars($_job['event_desc']),
'res' => htmlspecialchars($_job['event_result'])

);
			};
			if (!isset($ref)) {
				$ref[]=array('who'=>'No information','referral'=>'','outcome'=>'');
			};
			if (!isset($job)) {
				$job[]=array('type'=>'No information','ref'=>'','res'=>'');
			};
			mergeDocument(0,"tpl/patient-info.xml.docx",'trakData',$data,"cache/patient-info_" . date('U') . "_" . str_replace(' ', '', $_visit['name']) . ".docx",'trakRef',$ref,'trakJob',$job);	
		};
	};
	break;

};
case '5': // Unified clerking document
{

	$sql = sprintf ("	SELECT * FROM mau_patient pat, mau_visit vis
						WHERE vis.id='%s'
						AND pat.id = vis.patient
						LIMIT 1",
					mysql_real_escape_string($_REQUEST['vid']));
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
  	  echo 'Could not run query: ' . mysql_error();
  	  exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
			$_notes = dbGetByVisit('mau_data',$_visit['id']);
			$sql = sprintf(	"SELECT * FROM mau_activehx, med_activehx
					 WHERE patient = %s
					 AND mau_activehx.cond = med_activehx.id
					 ORDER BY mau_activehx.id;",
					 $_visit['patient']); $_ad = '';
			$adQuery = mysql_query($sql);
			if (!$adQuery) {
		echo 'Could not run query (disch_ActiveDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($adQuery) != 0) {

		while ($_ActiveDiagnosis = mysql_fetch_array($adQuery, MYSQL_ASSOC)) {
	
				$_ad .= $_ActiveDiagnosis['comorb'];
				$_ad .= '</w:t><w:br/><w:t>';
				
		};
		$_ad = substr($_ad,0,-18); // always remove the last </w:t><w:br/><w:t>
	};
			$sql = sprintf(	"SELECT * FROM mau_pmhx, med_pmhx
					 WHERE patient = %s
					 AND mau_pmhx.cond = med_pmhx.id
					 ORDER BY mau_pmhx.id;",
					 $_visit['patient']); $_pm = '';
			$pmQuery = mysql_query($sql);
			if (!$pmQuery) {
		echo 'Could not run query (disch_PMDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($pmQuery) != 0) {
				while ($_PMDiagnosis = mysql_fetch_array($pmQuery, MYSQL_ASSOC)) {
					$_pm .= $_PMDiagnosis['comorb'];
					$_pm .= '</w:t><w:br/><w:t>';
				};
				$_pm = substr($_pm,0,-18); // always remove the last </w:t><w:br/><w:t>
			};
			// $bc = new Barcode39($_visit['pas']);
			// $bc->draw(sprintf("/i-data/30dfda76/trak/cache/barcode/%s.gif",$_visit['pas']));
			$im     = imagecreate(150, 20);  
			$black  = ImageColorAllocate($im,0x00,0x00,0x00);  
			$white  = ImageColorAllocate($im,0xff,0xff,0xff);  
			imagefilledrectangle($im, 0, 0, 150, 20, $white);  
			$bc_data = Barcode::gd($im, $black, 100, 10, 0, "code128", $_visit['pas']); 
			imagegif($im, sprintf(dirname($_SERVER['SCRIPT_FILENAME'])."/cache/barcode/%s.gif",$_visit['pas']));
			$data[] = array(
		
				'name'		=>	strtoupper($_visit['name']),
				'addr'		=>	$_visit['paddr'],
				'adm'		=>	date("d/m/Y",strtotime($_visit['admitdate'])),
				'reason'	=>	$_notes['pc'],
				'admsrc'		=>	$baseSource[$_visit['source']][2],
				'activeDx'	=>	$_ad == '' ? 'No information' : $_ad,
				'pmHx'		=>	$_pm == '' ? 'No information' : $_pm,
				'site'		=>	$baseSites[$_visit['site']][0],
				'ward'		=>	$baseWards[$_visit['site']][$_visit['ward']][0],
				'dob'		=>	date("d/m/Y",strtotime($_visit['dob'])),
				'pas'		=>	$_visit['pas'],
				'NHS'		=>	$_visit['nhs'],
				'gpaddr'	=>	$_visit['gpaddr'],
				'gpname'	=>	'Dr ' . $_visit['gpname'],
				'todaysDate'=>	date("D jS F Y"),
				'consoc'	=>	$consultantsOncall[$_visit['site']][$_visit['consoc']],
				'x-adm'		=> '10/06/2012',
				'disch'		=>	'10/06/2013',
				'src'		=>	$baseSites[$_visit['site']][1] . ' ' . $baseWards[$_visit['site']][$_visit['ward']][1],
				'ambulatory'	=> $_visit['pathway'] != 0 ? $basePathway[$_visit['pathway']][0] : 'None',
				'triage' => trim( preg_replace( '/\s+/', ' ', $_notes['SBARs'] ) ),
				'barcode'=>	sprintf(dirname($_SERVER['SCRIPT_FILENAME']).'/cache/barcode/%s.gif',$_visit['pas'])

						
			);
			$refQuery = mysql_query("SELECT * FROM mau_referral WHERE visitid=" . $_visit['id']);
			while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
				if (in_array($_referral['who'],array(1,2,5,18))) continue;
				$noteHx = dbGetNote($_referral['id'],NOTE_REFHX);
				$noteDx = dbGetNote($_referral['id'],NOTE_REFDX);
				$ref[] = array(
		'who'		=>	$baseAuthorRole[$_referral['who']][0],
		'referral'	=>	$noteHx['note'],
		'outcome'	=>	$noteDx['note']
	);
			};
			$sql = sprintf ("	SELECT * FROM mau_events
							WHERE mau_events.vid = %s
							AND status < 16;",
    					$_visit['id']);
			$jobsQuery = mysql_query($sql); if (!$jobsQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}
			while ($_job = mysql_fetch_array($jobsQuery, MYSQL_ASSOC)) {
				$job[]=array(

'type' => $jobType[$_job['type']][0],
'ref' => htmlspecialchars($_job['event_desc']),
'res' => htmlspecialchars($_job['event_result'])

);
			};
			if (!isset($ref)) {
				$ref[]=array('who'=>'No information','referral'=>'','outcome'=>'');
			};
			if (!isset($job)) {
				$job[]=array('type'=>'No information','ref'=>'','res'=>'');
			};
			mergeDocument(1,"tpl/unified-clerking.docx",'trakData',$data,"cache/uniclerk_" . date('U') . "_" . str_replace(' ', '', $_visit['name']) . ".docx",'trakRef',$ref,'trakJob',$job);	
		};
	};
	break;

};

case '127': // Request form
{

$rx = multi_parse_str($_REQUEST['data']);

foreach($rx['ixtxt'] as $x){
$ix[]=htmlspecialchars(urldecode($x));
};





//print_r($rx['ixtxt']);
//echo $_REQUEST['task'];

$_ix = implode('</w:t><w:br/><w:t>',$ix);
$_clindata = htmlspecialchars(urldecode($_REQUEST['clin']));

$_extras = $_REQUEST['extras'];
//print_r($_extras);

parse_str($_extras, $output);


foreach($output as $key=>$value){
$extras[]=array('key'=>str_replace('_',' ',$key),'value'=>htmlentities($jobType[$_REQUEST['task']][4][$key][$value]));

};
//print_r($extras);
//exit;



	$sql = sprintf ("	SELECT * FROM mau_patient pat, mau_visit vis
						WHERE vis.id='%s'
						AND pat.id = vis.patient
						LIMIT 1",
					mysql_real_escape_string($_REQUEST['vid']));
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
  	  echo 'Could not run query: ' . mysql_error();
  	  exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_visit = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
			$_notes = dbGetByVisit('mau_data',$_visit['id']);
			$sql = sprintf(	"SELECT * FROM mau_activehx, med_activehx
					 WHERE patient = %s
					 AND mau_activehx.cond = med_activehx.id
					 ORDER BY mau_activehx.id;",
					 $_visit['patient']); $_ad = '';
			$adQuery = mysql_query($sql);
			if (!$adQuery) {
		echo 'Could not run query (disch_ActiveDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($adQuery) != 0) {

		while ($_ActiveDiagnosis = mysql_fetch_array($adQuery, MYSQL_ASSOC)) {
	
				$_ad .= $_ActiveDiagnosis['comorb'];
				$_ad .= '</w:t><w:br/><w:t>';
				
		};
		$_ad = substr($_ad,0,-18); // always remove the last </w:t><w:br/><w:t>
	};
			$sql = sprintf(	"SELECT * FROM mau_pmhx, med_pmhx
					 WHERE patient = %s
					 AND mau_pmhx.cond = med_pmhx.id
					 ORDER BY mau_pmhx.id;",
					 $_visit['patient']); $_pm = '';
			$pmQuery = mysql_query($sql);
			if (!$pmQuery) {
		echo 'Could not run query (disch_PMDiagnosis): ' . mysql_error();
		exit;
	};
			if (mysql_num_rows($pmQuery) != 0) {
				while ($_PMDiagnosis = mysql_fetch_array($pmQuery, MYSQL_ASSOC)) {
					$_pm .= $_PMDiagnosis['comorb'];
					$_pm .= '</w:t><w:br/><w:t>';
				};
				$_pm = substr($_pm,0,-18); // always remove the last </w:t><w:br/><w:t>
			};
			// $bc = new Barcode39($_visit['pas']);
			// $bc->draw(sprintf("/i-data/30dfda76/trak/cache/barcode/%s.gif",$_visit['pas']));
			$im     = imagecreate(150, 20);  
			$black  = ImageColorAllocate($im,0x00,0x00,0x00);  
			$white  = ImageColorAllocate($im,0xff,0xff,0xff);  
			imagefilledrectangle($im, 0, 0, 150, 20, $white);  
			$bc_data = Barcode::gd($im, $black, 100, 10, 0, "code128", $_visit['pas']); 
			imagegif($im, sprintf(dirname($_SERVER['SCRIPT_FILENAME'])."/cache/barcode/%s.gif",$_visit['pas']));
			$data[] = array(
		
				'name'		=>	strtoupper($_visit['name']),
				'addr'		=>	$_visit['paddr'],
				'adm'		=>	date("d/m/Y",strtotime($_visit['admitdate'])),
				'dt'		=>	date("d/m/Y g:i a"),
				'reason'	=>	$_notes['pc'],
				'admsrc'		=>	$baseSource[$_visit['source']][2],
				'activeDx'	=>	$_ad == '' ? 'No information' : $_ad,
				'pmHx'		=>	$_pm == '' ? 'No information' : $_pm,
				'site'		=>	$baseSites[$_visit['site']][0],
				'ssite'		=>	$baseSites[$_visit['site']][1],
				'ward'		=>	$baseWards[$_visit['site']][$_visit['ward']][0],
				'dob'		=>	date("d/m/Y",strtotime($_visit['dob'])),
				'pas'		=>	$_visit['pas'],
				'NHS'		=>	$_visit['nhs'],
				'gpaddr'	=>	$_visit['gpaddr'],
				'gpname'	=>	'Dr ' . $_visit['gpname'],
				'todaysDate'=>	date("D jS F Y"),
				'consoc'	=>	$consultantsOncall[$_visit['site']][$_visit['consoc']],
				'x-adm'		=> '10/06/2012',
				'disch'		=>	'10/06/2013',
				'src'		=>	$baseSites[$_visit['site']][1] . ' ' . $baseWards[$_visit['site']][$_visit['ward']][1],
				'ambulatory'	=> $_visit['pathway'] != 0 ? $basePathway[$_visit['pathway']][0] : 'None',
				'triage' => trim( preg_replace( '/\s+/', ' ', $_notes['SBARs'] ) ),
				'barcode'=>	sprintf(dirname($_SERVER['SCRIPT_FILENAME']).'/cache/barcode/%s.gif',$_visit['pas']),
				'ix'	=> $_ix,
				'xconsoc'	=>	munge_consultantname($consultantsOncall[$_visit['site']][$_visit['consoc']]),
				'clindata' => $_clindata


						
			);




			$refQuery = mysql_query("SELECT * FROM mau_referral WHERE visitid=" . $_visit['id']);
			while ($_referral = mysql_fetch_array($refQuery, MYSQL_ASSOC)) {
				if (in_array($_referral['who'],array(1,2,5,18))) continue;
				$noteHx = dbGetNote($_referral['id'],NOTE_REFHX);
				$noteDx = dbGetNote($_referral['id'],NOTE_REFDX);
				$ref[] = array(
		'who'		=>	$baseAuthorRole[$_referral['who']][0],
		'referral'	=>	$noteHx['note'],
		'outcome'	=>	$noteDx['note']
	);
			};
			$sql = sprintf ("	SELECT * FROM mau_events
							WHERE mau_events.vid = %s
							AND status < 16;",
    					$_visit['id']);
			$jobsQuery = mysql_query($sql); if (!$jobsQuery) {
			echo 'Could not run query: ' . mysql_error();
			exit;
		}
			while ($_job = mysql_fetch_array($jobsQuery, MYSQL_ASSOC)) {
				$job[]=array(

'type' => $jobType[$_job['type']][0],
'ref' => htmlspecialchars($_job['event_desc']),
'res' => htmlspecialchars($_job['event_result'])

);
			};
			if (!isset($ref)) {
				$ref[]=array('who'=>'No information','referral'=>'','outcome'=>'');
			};
			if (!isset($job)) {
				$job[]=array('type'=>'No information','ref'=>'','res'=>'');
			};
			
//			$extras[]=array('key'=>'UCR','value'=>'Banana');
//			$extras[]=array('key'=>'Priority','value'=>'Manana');
						
			mergeDocument(0,"tpl/labrequest-".$_REQUEST['task'].".xml.docx",'trakData',$data,"cache/labrequest-".$_REQUEST['task']."_" . date('U') . "_" . str_replace(' ', '', $_visit['name']) . ".docx",'trakRef',$ref,'trakJob',$job,'trakExtras',$extras);	
		};
	};
	break;

























break;
};

case '0': // PDF document
{

$_url = urlencode($_REQUEST['file']);

echo <<<HTML
<iframe id="pdfdocument" src="https://docs.google.com/viewer?embedded=true&amp;url=$_url" width="100%" height="100%" style="border: none;"></iframe>
HTML;
//echo <<<HTML
//<iframe type="text/html" width="100%" height="100%" src="http://vuzit.com/view/?url=$_url&output=embed&z=0&key=47103d76-8a40-7957-a9ed-c54df17d9ef0" frameborder="0" ></iframe>
//HTML;


break;
};


default:
{
echo 'Internal error: [DocumentRender] No document template specified!';
break;
};
endswitch;




break;
};


default:{
header('X-Trak: ' . VERSION);
header("Location: http://".HOST."index.php?act=show");
exit;
break;
};
endswitch; } // if ($_REQUEST)

else

{
// If we've reached this point, there are no interpretable $_REQUEST parameters in the url
header("Location: http://".HOST."index.php?act=show");
exit;
};

?>

