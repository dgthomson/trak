<?php 

function template() {

global $_REQUEST;
global $baseSites;
global $baseStatus;
global $baseWards;
global $baseSource;
global $baseAuthorRole;
global $baseOrganisation;
global $wardFilter;
global $jsFooter;

$_URL = 'http://'.$_SERVER['SERVER_NAME'].$_SERVER['SCRIPT_NAME'];

//	<script src="https://www.google.com/jsapi?key=ABQIAAAAqpgJdSBQ3ikU7mGFmdX6IBR3SwUA46KOq1J18feFyl1tK8y-BxQQURF-VWHff1pNCga_RTeA2EJBVg" type="text/javascript"></script>
// 	<!--[if IE]>
// 	<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js"></script>
//  <script type="text/javascript">
//  	CFInstall.check({mode: "overlay",destination: "http://bit.ly/mautrak"});
//  </script>
//  <![endif]-->
// 	<script src="http://www.bcherry.net/static/lib/js/badglobals.js"></script>
//	<!-- 	   .script("js/jquery-1.6.4.min.js")		   .script("js/jquery-ui-1.8.16.custom.min.js")	-->
//	<!--[if lt IE 9]>
//	<script src="http://ie7-js.googlecode.com/svn/version/2.1(beta4)/IE9.js">IE7_PNG_SUFFIX=".png";</script>
//	<![endif]-->


echo <<<HEADER
<!doctype html>
<html>
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
	<title>Trak | $baseOrganisation</title>
	<link type="text/css" rel="stylesheet" href="css/ui-lightness/jquery-ui-1.8.16.custom.css" />	
	<link type="text/css" rel="stylesheet" href="css/trak.css" media="screen,print"/>
	<link type="text/css" rel="stylesheet" href="css/badger.min.css" />
	<link type="text/css" rel="stylesheet" href="css/jquery.qtip.min.css" />
	<link type="text/css" rel="stylesheet" href="js/scheduler/dhtmlxscheduler_glossy.css" />
	<script type="text/javascript" src="js/LAB.min.js"></script>
	<script>
	   \$LAB
	   .script("https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js")
	   .script("https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.22/jquery-ui.min.js")
	   .script("lib/flexpaper/js/flexpaper_flash_debug.js")
	   .script("js/pdfobject.js")
	   .script("js/jquery.printElement.js")
	   .script("js/jquery.countdown.min-1.5-11.js")
	   .script("js/jquery.badger.min.js")
	   .script("js/jquery.qtip.min.js")
	   .script("js/jquery.scrollTo-1.4.2-min.js")
	   .script("js/jquery.validationEngine.js")
	   .script("js/jquery.validationEngine.en.js")
	   .script("js/plugin.scrollbar-min.js")
	   .script("js/scheduler/dhtmlxscheduler.js")
	   .script("js/AES/aes.js")
	   .script("js/AES/aes.ctr.js")
	   .script("js/AES/base64.js")
	   .script("js/AES/utf8.js")
	   .script("http://jsgauge.googlecode.com/svn/trunk/src/gauge.js")
	   .script("http://jsgauge.googlecode.com/svn/trunk/src/jquery.gauge.js")
	   .script("js/jquery.trak.js").wait(function(){
	   		try {
	   			trak.url = '$_URL';
	   			trak.init();
	   		} catch(error) {
	   			trak.confirm('There was a javascript runtime error. Sorry.<p>[init] '+error.message+'.</p>',220)
	   		};
	   });
	</script>
</head>
<body>
HEADER;

echo '<table cellpadding="4" cellspacing="2" width="919" class="patList"><thead style="display:none;" id="trakButtons"><tr><th colspan="5">';
echo PHP_EOL;

echo '<div id="selSite">';
echo PHP_EOL;
echo '<div style="float:left;">'; // margin-right usually 7px by default
echo PHP_EOL;
echo '<div class="hdrDialogButtons">';// style="margin-right:5px;">';
echo PHP_EOL;
foreach ($baseSites as $k => $v) {
	printf ('<input class="hdrSelSite" %svalue="%s" type="radio" id="AAdestSite%s" name="selectSite" />',DEFAULTSITE == $k ? 'checked="checked" ' : "",$k,$k);
	printf ('<label for="AAdestSite%s">%s</label>',$k,$v[1]);
	echo PHP_EOL;

//printf('<div class="hdrSelSite" data-sid="%s">%s</div>',$k,$v[1]);


};
echo	"</div>";
echo PHP_EOL;
echo	"</div>";
echo PHP_EOL;

// Selected ward and link to ward list

// echo '<div style="float:left;">';
// echo PHP_EOL;
// echo '<div class="hdrDialogButtons hdrSelWard">';
// echo PHP_EOL;
// printf ('<input checked="checked" type="radio" id="hdrSelWardID" name="selectWard" /><label style="xwidth:60px;" for="hdrSelWardID">%s</label>',$baseWards[DEFAULTSITE][DEFAULTWARD][1]);
// echo PHP_EOL;
// echo	"</div>";
// echo PHP_EOL;
// echo	"</div>";
// echo PHP_EOL;
// echo '<div style="float:left;">';
// echo PHP_EOL;
// echo '<div class="hdrDialogButtons hdrFilter">';
// echo PHP_EOL;
// printf ('<input checked="checked" type="radio" id="hdrFilter" name="selectFilter" /><label for="hdrFilter">%s</label>','All');
// echo PHP_EOL;
// echo	"</div>";
// echo	"</div>";

printf ('<div class="hdrSelWard" style="float:left;">%s</div>',$baseWards[DEFAULTSITE][DEFAULTWARD][1]);
printf ('<div class="hdrFilter" style="float:left;">%s</div>','All');



//printf ('<div data-href="%s" style="float:left;" class="handoverDox">Print</div>','http://'.HOST.'/index.php?act=handover');
//printf ('<a href="%s" style="float:left;" id="action-print"><img border="0" style="margin-top:2px;" src="gfx/Hardware-Laser-Printer-icon.png" width="32" height="32" /></a>','http://'.HOST.'/index.php?act=handover');
printf ('<div class="ui-button" style="float:left;" id="action-print"><img border="0" style="margin-top:2px;" src="gfx/Hardware-Laser-Printer-icon.png" width="28" height="28" /></div>');

echo '<div style="float:right; font-size:13px;">';
//printf ('<div id="action-test">Test button</div>');
printf ('<div id="action-beds">Beds</div>');
printf ('<div id="action-search">Search</div>');
//echo PHP_EOL;
printf ('<div id="action-diary">Diary</div>');
//echo PHP_EOL;
// printf ('<div id="action-jobs">Jobs</div>');
// echo PHP_EOL;
printf ('<div id="action-lists">Lists</div>');
//echo PHP_EOL;
printf ('<div id="action-pathways">Documents</div>');
//echo PHP_EOL;
// printf ('<div id="action-han">HAN</div>');
// echo PHP_EOL;

//printf ('<a href="http://'.HOST.'/index.php?act=HANlist" id="dispHAN">HAN</a>',$_REQUEST['site']);
//echo PHP_EOL;
//printf ('<a href="http://'.HOST.'/index.php?act=trakDash" id="trakDash">Report</a>');
//echo PHP_EOL;
//printf ('<a href="http://'.HOST.'/index.php?act=formAddPat" id="action-add">Add</a>');
printf ('<div id="action-add">Add</a>');
echo PHP_EOL;
echo '</div>';


echo '<div style="display:none;"><div id="hdrFilterList">';
	filter_showButtons($_REQUEST['site'],$_REQUEST['ward']);
echo '</div></div>';

echo '<div style="display:none;"><div id="hdrWardList">';
foreach ($baseWards[DEFAULTSITE] as $k => $v) {
	printf('<div class="hdrWideButtons" data-wid="%s">%s</div><br/>',$k,$v[1]);
};
echo '</div></div>';

echo '</div></th></tr></thead>'; // id=selSite
echo '<tbody class="trakPatient"></tbody></table>';
printf ('</body></html><!-- version %s -->',VERSION);
}; // template()

?>