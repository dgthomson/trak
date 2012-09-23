<?php

global $TRANSACTION_RUNNING;
ini_set('display_errors', 1);

// function beforeRender($row) { 
//     if($row->get_value('id_grupos_ofertas') != IDG) { 
//         $row->skip(); 
//     } 
// } 

// file_array() by Jamon Holmgren. Exclude files by putting them in the $exclude
// string separated by pipes. Returns an array with filenames as strings.
function file_array($path, $exclude = ".|..", $recursive = false) {
        $path = rtrim($path, "/") . "/";
        $folder_handle = opendir($path);
        $exclude_array = explode("|", $exclude);
        $result = array();
        while(false !== ($filename = readdir($folder_handle))) {
            if(!in_array(strtolower($filename), $exclude_array)) {
                if(is_dir($path . $filename . "/")) {
                    if($recursive) $result[] = file_array($path, $exclude, true);
                } else {
                    $result[] = $filename;
                }
            }
        }
        return $result;
    }
function calendarFormatting($row) {

	global $_nameCache;
	global $baseWards;
	global $jobType;
	$_pID = $row->get_value("pID");
	if ($_nameCache[$_pID] == "") {
		$dbQuery = mysql_query("SELECT name,bed,ward,site FROM mau_patient p, mau_visit v WHERE p.id = '". $_pID ."' AND p.id = v.patient LIMIT 1;");
		if (!$dbQuery) {
   			echo 'Could not run query: (calendarFormatting)' . mysql_error();
   			exit;
		};
		$dbResult = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
		switch ($dbResult['bed']):
			case 0:
				$_bed = 'Chair';
				break;
			case 127:
				$_bed = 'Virtual';
				break;
			default:
				$_bed = $dbResult['bed'];
				break;
		endswitch;
		$_nameCache[$_pID] = sprintf('%s (%s/%s)', $dbResult['name'],  $baseWards[$dbResult['site']][$dbResult['ward']][1], $_bed );
	};
	$row->set_value("event_text", $_nameCache[$_pID] . ' : ' . $jobType[$row->get_value("type")][0] );	

};
function multi_parse_str($str) {
  # result array
  $arr = array();

  # split on outer delimiter
  $pairs = explode('&', $str);

  # loop through each pair
  foreach ($pairs as $i) {
    # split into name and value
    list($name,$value) = explode('=', $i, 2);
	$arr[$name][] = $value;
  }
  # return result array
  return $arr;
}

function munge_consultantname($str) {

return 'Dr '. substr($str, -1) . ' ' . substr($str, 0, -2);

};


function years_old($dob){ 
    if (($dob = strtotime($dob)) === false) 
    { 
        throw new Exception('strtotime parsing fails it'); 
    } 
    for ($i = 0; strtotime("-$i year") > $dob; ++$i); 
    return $i - 1; 
}
function dbTime($table,$id,$key){
	$sql = sprintf(	"UPDATE `%s` SET `%s` = NOW( ) WHERE `id` = %s;" ,mysql_real_escape_string($table),mysql_real_escape_string($key),mysql_real_escape_string($id));
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
		echo 'dbTime: could not run query: ' . mysql_error();
		exit;
	};
};
function implode_with_key($assoc, $inglue = '=', $outglue = '&'){
    $return = '';
    foreach ($assoc as $tk => $tv) {
        $return = ($return != '' ? $return . $outglue : '') .
            $tk . $inglue . "'" . mysql_real_escape_string($tv) . "'";
    }
    return $return;
};
function cbits($value){
$count = 0;

    while ($value > 0) {          
        if (($value & 1) == 1)     
            {
            $count++;
            };
        $value >>= 1;           
    };

return $count;
}
function dbConnect() {
	$dbConnection = mysql_connect(DBHOST,DBUSER,DBPASS);
	if (!$dbConnection)
	{
	  die('Could not connect: ' . mysql_error());
	};
	$dbSelected = mysql_select_db(DBNAME);
	if (!$dbSelected) {
		die ('Can\'t use ' . DBNAME . ' : ' . mysql_error());
	};
	return $dbConnection;
};
function dbStartTransaction() {
	$dbQuery = mysql_query("START TRANSACTION");
	if (!$dbQuery) {
		echo 'Could not run query [transactionStart]: ' . mysql_error();
		exit;
	} else {
	  $TRANSACTION_RUNNING = TRUE;
	};
};
function dbEndTransaction() {
	$dbQuery = mysql_query("COMMIT");
	if (!$dbQuery) {
		echo 'Could not run query [transactionEnd]: ' . mysql_error();
		exit;
	} else {
	  $TRANSACTION_RUNNING = FALSE;
	};
};
function dbAbortTransaction() {
	$dbQuery = mysql_query("ROLLBACK");
	if (!$dbQuery) {
		echo 'Could not run query [transactionRollback]: ' . mysql_error();
		exit;
	} else {
	  $TRANSACTION_RUNNING = FALSE;
	};
};
function dbPut($type,$table,$data,$id) {
	if ($type == INSERT) {
		$sql = sprintf(	'INSERT INTO %s (%s) VALUES ("%s")', $table,
						implode(', ', array_map('mysql_real_escape_string', array_keys($data))),
						implode('", "',array_map('mysql_real_escape_string', $data)));
	} else {
		$sql  = "UPDATE " . mysql_real_escape_string($table) . " SET ";
		$sql .= implode_with_key($data,"=",", ");
		$sql .= " WHERE id = '". mysql_real_escape_string($id) ."';";
	};
	//echo "dbOp Put: $sql";
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
		echo 'Could not run query: ' . mysql_error();
		//if ($TRANSACTION_RUNNING) {
		//	dbAbortTransaction();
		//};
		exit;
	};
	#header("Location: /index.php?act=show");
	#exit;
};
function dbPutNote($type,$data,$id,$noteid,$notetype) {
	if ($type == INSERT) {
		$sql = sprintf('INSERT INTO mau_note (refid,note,type) VALUES ("%s","%s","%s")',mysql_real_escape_string($id),mysql_real_escape_string($data),mysql_real_escape_string($notetype)); 
	} else
	{
		$sql = sprintf('UPDATE mau_note SET refid = "%s", note = "%s", type = "%s" WHERE id = "%s";',mysql_real_escape_string($id),mysql_real_escape_string($data),mysql_real_escape_string($notetype),mysql_real_escape_string($noteid));
	};
	//echo "dbOp Note: $sql";
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
		echo 'Could not run query: ' . mysql_error();
		exit;
	};
	#header("Location: /index.php?act=show");
	#exit;
}
function dbGet($table,$id) {
	$dbQuery = mysql_query("SELECT * FROM $table WHERE id = '$id' LIMIT 1");
	if (!$dbQuery) {
   		echo 'Could not run query: ' . mysql_error();
   		exit;
	};
	$row = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
	return $row;
};
function dbGetByVisit($table,$id) {
	$dbQuery = mysql_query("SELECT * FROM $table WHERE visitid = '$id' LIMIT 1");
	if (!$dbQuery) {
   		echo 'Could not run query: ' . mysql_error();
   		exit;
	};
	$row = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
	return $row;
};
function dbGetNote($id,$notetype) {
	$dbQuery = mysql_query("SELECT * FROM mau_note WHERE refid = '$id' AND type = '$notetype' LIMIT 1");
	if (!$dbQuery) {
   		echo 'Could not run query: ' . mysql_error();
   		exit;
	};
	$row = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
	return $row;
};
function formWrite($label,$type,$name,$value) {
	if ($label != "") {
		printf ('<br /><label for="%s">%s</label>',$name,$label);
	};
if ($type == "date") {
	printf ('<input type="%s" id="%s" name="%s" value="%s" class="datepicker" />',$type,$name,$name,$value);
	echo "\n";
} else
{
	printf ('<input type="%s" id="%s" name="%s" value="%s" />',$type,$name,$name,$value);
	echo "\n";
};
};
function formWriteDrop($list,$label,$name,$value,$index=0) {
	if ($label != "") {
		printf ('<br /><label for="%s">%s</label>',$name,$label);
	};
	echo "<select name=\"$name\" id=\"jQ$name\">";
	foreach ($list as $k=>$v) {
	echo "<option value=\"$k\"";
	if ($k==$value) {echo " selected=\"selected\"";};
	echo ">$v[$index]</option>";
	}
	echo "</select>";
	echo "\n";
};
function formWriteDropSimple($list,$label,$name,$value) {
	if ($label != "") {
		printf ('<br /><label for="%s">%s</label>',$name,$label);
	};
	echo "<select name=\"$name\" id=\"jQ$name\">";
	foreach ($list as $k=>$v) {
	echo "<option value=\"$k\"";
	if ($k==$value) {echo " selected=\"selected\"";};
	echo ">$v</option>";
	}
	echo "</select>";
	echo "\n";
};
function formWriteTA($label,$name,$value,$row,$col) {
	if ($label != "") {
		printf ('<br /><label for="%s">%s</label>',$name,$label);
	};
printf ('<textarea rows="%s" cols="%s" id="%s" name="%s">',$row,$col,$name,$name);
echo $value;
echo '</textarea>';
echo "\n";

};
function form_ActiveDiagnosis($_patient) {

	// HTML
	echo '<div style="float:left;">';
	echo '<label style="padding-left:3px;margin-left:1px;" for="note_rec" class="nLabel">Active diagnosis</label><br />';
	echo '<fieldset id="ahlist" class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="overflow-y:auto;overflow-x:hidden;width:300px;height:102px;">';
	$sql = sprintf(	"SELECT * FROM mau_activehx, med_activehx
					 WHERE patient = %s
					 AND mau_activehx.cond = med_activehx.id
					 ORDER BY mau_activehx.id;",
					 $_patient);
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
		echo 'Could not run query (form_ActiveDiagnosis): ' . mysql_error();
		exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_ActiveDiagnosis = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
	
				$o_s 		= '<span class="_cond">';
				$o_e 		= '</span>';
				$o_name		= $_ActiveDiagnosis['comorb'];
				$o_id		= '<input value="'. $_ActiveDiagnosis['id'] .'" type="hidden" name="acthx" />';
				$o_nameid	= '<input value="" type="hidden" name="acthxname" />';
				$o_remove	= '<a class="_R" href="#">✕</a>';
	
				echo $o_s . $o_name . $o_id . $o_nameid . $o_remove . $o_e;
		}
	}
	// HTML
	echo '</fieldset>';
	echo '<div style="float:left;">';
	printf ('<input style="padding-right:3px;margin-right:1px;padding-left:3px;margin-left:1px;margin-top:3px;
	width:235px;" name="activehxauto" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="activehxauto" value=""/>');
	echo '<a id="activecondAddButton">Add</a>';
	echo "</div>";
	echo "</div>";

};
function form_PastMedicalHistory($_patient) {

	// HTML
	echo '<div style="float:left;">';
	echo '<label style="padding-left:3px;margin-left:1px;" for="note_rec" class="nLabel">Past medical history</label><br />';
	echo '<fieldset id="hlist" class="ui-tabs ui-widget ui-widget-content ui-corner-all" style="overflow-y:auto;overflow-x:hidden;width:300px;height:102px;">';

	$sql = sprintf(	"SELECT * FROM mau_pmhx,med_pmhx
					 WHERE patient = %s
					 AND mau_pmhx.cond = med_pmhx.id
					 ORDER BY mau_pmhx.id;",
					 $_patient);
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
		echo 'Could not run query (form_PastMedicalHistory): ' . mysql_error();
		exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		while ($_PastMedicalHistory = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
		
				$o_s		= '<span class="_cond">';
				$o_e		= '</span>';
				$o_name		= $_PastMedicalHistory['comorb'];
				$o_id		= '<input value="'. $_PastMedicalHistory['id'] .'" type="hidden" name="pmhx" />';
				$o_nameid	= '<input value="" type="hidden" name="pmhxname" />';
				$o_remove	= '<a class="_R" href="#">✕</a>';
	
				echo $o_s . $o_name . $o_id . $o_nameid . $o_remove . $o_e;
		
		}
	}
	// HTML
	echo '</fieldset>';
	echo '<div style="float:left;">';
	printf ('<input style="padding-right:3px;margin-right:1px;padding-left:3px;margin-left:1px;margin-top:3px;
	width:235px;" name="pmhxauto" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="pmhxauto" value=""/>');
	echo '<a id="condAddButton">Add</a>';
	echo "</div>";
	echo "</div>";

};
function db_ActiveDiagnosis($rx) {

 if (array_key_exists('acthx', $rx)) {
 for ($loop=0; $loop < count($rx['acthx']); $loop++)
 {
  if (!empty($rx['acthx'][$loop]))
  {
   // Use existing comorbitidy entry
   $map['cond'] = $rx['acthx'][$loop];
  }
  else
  {
   // Make new comorbitidy entry
   $dbQuery = mysql_query(sprintf("SELECT * FROM `med_activehx` WHERE `comorb` LIKE '%s' LIMIT 1;",urldecode($rx['acthxname'][$loop])));
   if (!$dbQuery) {
    echo 'Could not run query (activehxAddMake): ' . mysql_error();
	dbAbortTransaction();
    exit;
   };

   if (mysql_num_rows($dbQuery) != 0) {
    // Comorbitidy exists after all
    $_rx = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
    $map['cond'] = $_rx['id'];
   }
   else
   {
    // Create new comorbitidy
    $drugmap = array(
    	"comorb"	=> ucfirst(urldecode($rx['acthxname'][$loop])),
    );
    dbPut(INSERT,'med_activehx',$drugmap,NULL);
    $map['cond'] = mysql_insert_id();	
   };
  }; // entry loop for drug name


  $map['patient'] = $_REQUEST['pid'];
  dbPut(INSERT,'mau_activehx',$map,NULL);
 };// pmhx loop
 };

};
function db_PastMedicalHistory($rx) {

 if (array_key_exists('pmhx', $rx)) {
 for ($loop=0; $loop < count($rx['pmhx']); $loop++)
 {
  if (!empty($rx['pmhx'][$loop]))
  {
   // Use existing comorbitidy entry
   $map['cond'] = $rx['pmhx'][$loop];
  }
  else
  {
   // Make new comorbitidy entry
   $dbQuery = mysql_query(sprintf("SELECT * FROM `med_pmhx` WHERE `comorb` LIKE '%s' LIMIT 1;",urldecode($rx['pmhxname'][$loop])));
   if (!$dbQuery) {
    echo 'Could not run query (pmhxAddMake): ' . mysql_error();
	dbAbortTransaction();
    exit;
   };

   if (mysql_num_rows($dbQuery) != 0) {
    // Comorbitidy exists after all
    $_rx = mysql_fetch_array($dbQuery, MYSQL_ASSOC);
    $map['cond'] = $_rx['id'];
   }
   else
   {
    // Create new comorbitidy
    $drugmap = array(
    	"comorb"	=> ucfirst(urldecode($rx['pmhxname'][$loop])),
    );
    dbPut(INSERT,'med_pmhx',$drugmap,NULL);
    $map['cond'] = mysql_insert_id();	
   };
  }; // entry loop for drug name


  $map['patient'] = $_REQUEST['pid'];
  dbPut(INSERT,'mau_pmhx',$map,NULL);
 };// pmhx loop
 };


};
function form_listActiveDiagnosis($_patient) {

	$sql = sprintf(	"SELECT * FROM mau_activehx, med_activehx
					 WHERE patient = %s
					 AND mau_activehx.cond = med_activehx.id
					 ORDER BY mau_activehx.id;",
					 $_patient);
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
		echo 'Could not run query (form_ActiveDiagnosis): ' . mysql_error();
		exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		echo '<ol class="_hxList">';
		while ($_ActiveDiagnosis = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
	
				echo '<li>';
				echo $_ActiveDiagnosis['comorb'];
				echo '</li>';
				
		};
		echo '</ol>';
	}
	else
	{
		echo '<div class="_hxListNull">No information available</div>';
	};



};
function form_listPastMedicalHistory($_patient) {

	$sql = sprintf(	"SELECT * FROM mau_pmhx,med_pmhx
					 WHERE patient = %s
					 AND mau_pmhx.cond = med_pmhx.id
					 ORDER BY mau_pmhx.id;",
					 $_patient);
	$dbQuery = mysql_query($sql);
	if (!$dbQuery) {
		echo 'Could not run query (form_PastMedicalHistory): ' . mysql_error();
		exit;
	};
	if (mysql_num_rows($dbQuery) != 0) {
		echo '<ol class="_hxList">';
		while ($_PastMedicalHistory = mysql_fetch_array($dbQuery, MYSQL_ASSOC)) {
		
				echo '<li>';
				echo $_PastMedicalHistory['comorb'];
				echo '</li>';
				
		};
		echo '</ol>';		
	}
	else
	{
		echo '<div class="_hxListNull">No information available</div>';
	};



}
function form_nld($notes,$_readonly = 0) {


$_ach=array(0=>'✘',1=>'✔');

echo '<label for="_xxx" class="nLabel">Nurse discharge criteria</label><br />';
echo '<div class="_refborder" style="width:384px;">';
for ($_loop=1;$_loop <= 6; $_loop++) {
//NLD
echo '<div style="float:left;">';
if ($_loop==1) {
	printf ('<label for="nldcriterion%s" class="nLabel" style="margin-left:22px;">Criterion</label><br />',$_loop,$_loop+10111);
};
printf ('<div class="nLabel" style="font-size:20px;display:block;float:left;margin-top:2px;">&#%s;&nbsp;</div>',$_loop+10111);
printf ('<input %sname="nldcrit" class="ui-widget ui-state-default ui-corner-all noteAuthorField" type="text" id="nldcriterion%s" value="%s" %s/>', $_loop == 6 ? '' : 'style="margin-bottom:12px;" '  ,$_loop,$notes['nldcrit' . $_loop], $_readonly==1?'readonly="readonly" ':'');
echo	"</div>";
echo '<div style="float:left;">';
if ($_loop==1) {
	printf ('<label for="nldcrityn%s" class="nLabel">Achieved</label><br />',$_loop-1);
};
echo '<div class="dialogButtons">';
foreach ($_ach as $k => $v) {
	printf	('<input %svalue="%s" data-disabled="disabled" type="radio" id="nldcriterionach%s%s" name="nldcrityn%s" /><label style="margin-top:-1px;" for="nldcriterionach%s%s">%s</label>',
				$notes['nldcrityn'.$_loop] == $k ? 'checked="checked" ' : "",
				$k,$_loop,$k,$_loop-1,$_loop,$k, $k==0?'<span style="color:red;">'.$v.'</span>':'<span style="color:green;">'.$v.'</span>'     );};
echo	"</div>";
echo	"</div>";









};
echo '</div>';



};


function bedBash_number($num,$status=1,$site,$ward,$id) {
global $bbCol;
if ($status==5)
{
	$extra="color:black;";
}
else
{
	$extra="";
};

printf	(	'<dt data-visitid="%s" data-site="%s" data-ward="%s" data-bed="%s" style="background-color:%s;%s">',
			$id,
			$site,
			$ward,
			$num,
			$bbCol[$status],
			$extra
		);
if ($num!=0) {
echo $num;
}
else
{
//echo '&asymp;';
echo '&#9281;';
};
echo '</dt>';

};
function bedBash_name($name,$destSite=0,$destWard=0,$destBed=0) {
global $baseSites;
global $baseWards;

				printf ('<dd data-name="%s">',$name);

	if ($destSite==127) {echo '➟&thinsp;Home';};
	if (($destSite !=127) && ($destSite >0)) {
	
		//echo '➟&thinsp;';
		if ($_REQUEST['ssite'] != $destSite) echo $baseSites[$destSite][1] . '&thinsp;';
		echo $baseWards[$destSite][$destWard][1] . '&thinsp;';
		if ($_REQUEST['ssite'] == $destSite) {
		
			switch ($destBed):
				case 0:
					echo '⑁';
					break;
				case 127:
					echo '☁';
					break;
				default:
					echo $destBed;
					break;
			endswitch;

		
		};
	};

				//echo $name;
//echo '&nbsp';
				echo '</dd>';
};

function mergeDocument($template,$root,$data,$out,$mergeRoot='',$merge=0,$jobRoot='',$job=0,$skipHeader=0) {

		$_key = 'K8582886212201292249';
		include_once('lib/tbs_class.php');
		include_once('lib/plugins/tbs_plugin_opentbs.php');
		$TBS = new clsTinyButStrong;
		$TBS->Plugin(TBS_INSTALL, OPENTBS_PLUGIN);
		$TBS->LoadTemplate($template, OPENTBS_ALREADY_XML);
		
		//$TBS->Plugin(OPENTBS_DEBUG_XML_CURRENT);
		
		$TBS->MergeBlock($root, $data);
		
		if ($mergeRoot!='')
		{
			$TBS->MergeBlock($mergeRoot, $merge);	
		};
		if ($jobRoot!='')
		{
			$TBS->MergeBlock($jobRoot, $job);	
		};		
		
if ($skipHeader == 1)
{
}
else
{
		$TBS->LoadTemplate('#word/header1.xml'); 	$TBS->MergeBlock($root, $data);
};
		//$TBS->LoadTemplate('#word/header2.xml');	$TBS->MergeBlock($root, $data);
		//$TBS->LoadTemplate('#word/header3.xml');	$TBS->MergeBlock($root, $data);
		//$TBS->LoadTemplate('#word/footer1.xml');	$TBS->MergeBlock($root, $data);
		//$TBS->LoadTemplate('#word/footer2.xml');	$TBS->MergeBlock($root, $data);
		//$TBS->LoadTemplate('#word/footer3.xml');	$TBS->MergeBlock($root, $data);
		$_url = urlencode('http://' . HOST . $out);
		$TBS->Show(OPENTBS_FILE, $out);

//echo <<<HTML
//<iframe id="adeptol" name="ajaxdocumentviewer" src="http://connect.ajaxdocumentviewer.com?key=$_key&document=$_url&viewerheight=650&viewerwidth=800&cache=yes" border="0" height="650" width="800" scrolling="no" align="left" frameborder="0" marginwidth="1" marginheight="1"> Your browser does not support inline frames or is currently configured not to display inline frames. </iframe>
//HTML;

echo <<<HTML
<iframe id="handover" src="https://docs.google.com/viewer?embedded=true&amp;url=$_url" width="770" height="550" style="border: none;"></iframe>
HTML;

// <embed width="100%" height="100%" name="plugin" src="" type="application/pdf">


};

function filter_showButtons($site,$ward) {
	global $wardFilter;
	printf ('<div class="hdrWideButtons2" data-fid="%s" data-text="%s">All</div><br>',0,"All");
	if(isset($wardFilter[$site][$ward])){
	foreach ($wardFilter[$site][$ward] as $k => $v) {
		printf ('<div class="hdrWideButtons2" data-fid="%s" data-text="%s">%s</div><br>',$k,$v[0],$v[0]);
	};
	};
	printf ('<div class="hdrWideButtons2" data-fid="%s" data-text="%s">Chairs</div><br>',126,"Chairs");
	printf ('<div id="_vWard" class="hdrWideButtons2" data-fid="%s" data-text="%s">Virtual</div>',127,"Virtual");

$sql = sprintf("SELECT * FROM `mau_visit` WHERE `site` = %s AND `ward` = %s AND `bed` = 127",$site,$ward);
$_vQuery = mysql_query($sql);
if (mysql_num_rows($_vQuery) != 0) {
$_number = mysql_num_rows($_vQuery);
echo <<<HTML
<script type="text/javascript">
	 $('#_vWard').badger('$_number');
</script>
HTML;
};


};

function form_ews($_ews) {

echo '<div style="float:left;">';
echo '<label for="_ewsButton" class="nLabel">EWS</label><br />';
printf(	'<div class="_noselect patient-ews" id="_patient-ews">%s</div>',  $_ews	);
printf( '<input type="hidden" value="%s" id="_patient-ews-code" name="patient-ews-code" />', $_ews );
echo '</div>';
echo	"</div>";

};




function cache_control() {

	// http://css-tricks.com/snippets/php/intelligent-php-cache-control/

	$lastModified		= filemtime(CONFIGFILE);
	$etagFile			= md5_file(CONFIGFILE);
	$ifModifiedSince	= ( isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])	? $_SERVER['HTTP_IF_MODIFIED_SINCE']	: false);
	$etagHeader			= ( isset($_SERVER['HTTP_IF_NONE_MATCH'])		? trim($_SERVER['HTTP_IF_NONE_MATCH'])	: false);

	//header("Last-Modified: ".gmdate("D, d M Y H:i:s", $lastModified)." GMT");
	header("ETag: \"$etagFile\"");
	header('Cache-Control:max-age=3600');
	//header("Expires: ".gmdate("D, d M Y H:i:s", strtotime('+1 week')) . " GMT");
	
	if (	@strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) == $lastModified ||
		$etagHeader == $etagFile) {
		header("HTTP/1.1 304 Not Modified");
		exit;
};

};



?>