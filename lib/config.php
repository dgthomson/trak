<?php

// echo $_SERVER['SERVER_NAME'];
// echo dirname($_SERVER['SCRIPT_NAME']);

define('VERSION','0.4 © David Thomson 19-August-2012');
define('HOST',$_SERVER['SERVER_NAME'].dirname($_SERVER['SCRIPT_NAME']).'/');
define('DBHOST','localhost');
//define('DBNAME','trak_live');
define('DBNAME','trak');
define('DBUSER','root');
define('DBPASS','oscarg66');
define('CONFIGFILE',__FILE__);
date_default_timezone_set('Europe/London');

// Password for client/server AES encryption/decryption and login
$__PW  = 'trak';

define('INSERT',1);
define('UPDATE',0);
define('PATHWAYS_PATH',dirname($_SERVER['SCRIPT_FILENAME']).'/pathways/');

define('NOTE_NOTE',0);
define('NOTE_REFHX',1);
define('NOTE_REFDX',2);
// define('RX_REC',3);
// define('RX_DISC',4);

ini_set('display_errors', 1);
global $TRANSACTION_RUNNING; $TRANSACTION_RUNNING = FALSE;

if (isset($_COOKIE['cookieSite'])) {
	define('DEFAULTSITE',$_COOKIE['cookieSite']);
	define('DEFAULTWARD',$_COOKIE['cookieWard']);
} else {
	define('DEFAULTSITE',1);
	define('DEFAULTWARD',1);
};

$baseOrganisation = "Pennine Acute Hospitals NHS Trust";
$baseSites = array(
	1 => array("Royal Oldham Hospital",				"ROH"),
	2 => array("North Manchester General Hospital",	"NMGH"),
	3 => array("Fairfield General Hospital",		"FGH"),
	4 => array("Rochdale Infirmary",				"RI"),
	5 => array("Birch Hill Hospital",				"BHH")
	);


// Must be in the format <lastname><space><singleinitial>
$consultantsOncall 	= array(


1	=> array(

				1	=>	"Mishra B",
				2	=>	"Rameh B",
				3	=>	"Conlong P",
				4	=>	"Devakumar V",
				5	=>	"Sridharan V",
				6	=>	"Vassallo J",
				7	=>	"Ahmed U",
				8	=>	"Solomon S",
				9	=>	"Jagadhish T",
				10	=>	"Thomas W"
				
				
			),
2	=> array(

				1	=>	"OC Smith",
				2	=>	"OC Jones",
				3	=>	"OC Black",
				4	=>	"OC Jizza"

			),
3	=> array(

				1	=>	"Bury Smith",
				2	=>	"Bury Jones",
				3	=>	"Bury Black",
				4	=>	"Bury Jizza"

			),




);
$consultantsMAU		= array(

1	=> array(

				1	=>	"Thomson D",
				2	=>	"Chandran S",
				3	=>	"Raychaudhuri R",
				4	=>	"Pradhan S",
				5	=>	"Kolakkat S",
				6	=>	"Manavalan T",
				7	=>	"Prakash P",
				8	=>	"Bhat S",
				9	=>	"Chandrasekhar H"
				
			),
2	=> array(

				1	=>	"Smith",
				2	=>	"Jones",
				3	=>	"Black",
				4	=>	"Jizza"

			),
3	=> array(

				1	=>	"",
				2	=>	"",
				3	=>	"",
				4	=>	""

			),
4	=> array(

				1	=>	"",
				2	=>	"",
				3	=>	"",
				4	=>	""

			),

);


// per-site, usually the MAU
$baseDefaultWards = array(

1 => 1,
2 => 1,
3 => 1,
4 => 1,
5 => 1
);


// Format: Ward name, ward shortname, number of beds
$baseWards =   array(

	1 => array(	   1 => array("Medical Assessment Unit",	"MAU",	49),
				   2 => array("Coronary Care Unit",			"CCU",8),
				   3 => array("F7 (Respiratory)",			"F7",24),
				   4 => array("F8 (Cardiology)",			"F8",18),
				   5 => array("T5 (Short Stay)",			"T5",24),
				   6 => array("F2 (Endocrinology)",			"F2",24),
				   7 => array("G1 (Stroke)",				"G1",18),
				   8 => array("G2 (Gastroenterology)",		"G2",24),
				   9 => array("A1 (Discharge)",				"A1",16),
				   10 => array("A&E Observation Ward",	"Obs",8),
				   11 => array("DVT Clinic",				"DVT",3),
				   12 => array("Ambulatory Assessment Unit",	"AAU",3)
			  ),

	2 => array(	   1 => array("Medical Assessment Unit",	"MAU",	28),
				   2 => array("Coronary Care Unit",			"CCU",12),
				   3 => array("C4 (Respiratory)",			"C4",18),
				   4 => array("C3 (General Medicine)",		"C3",24),
				   5 => array("J6 (Infectious Diseases)",	"J6",28)
			  ),	

	3 => array(	   1 => array("Medical Assessment Unit",	"MAU",24),
				   2 => array("Coronary Care Unit",			"CCU",8),
				   3 => array("Ward 6 (Respiratory)",		"W6",24)
			  ),		

	4 => array(	   1 => array("Clinical Assessment Unit",	"CAU",12)
			),

	5 => array(	   1 => array("New Patient Unit",	"CAU",8),
	 			  2 => array("Long-stay Unit",	"LSU",42)
	 			  
				  )
	
);

// Format: Filter name, beds in group (comma-separated)
$wardFilter = array(

1 =>   array(
				1 => array( 1 => array('Bay 1','1,2,4,5,6,7,8,9'),
							2 => array('Bay 2','3,10,11,12,13,14,15'),
							3 => array('Bay 3','16,17,18,19,20,21,22,23,24,25'),
							4 => array('Bay 4','26,27,28,29,30,31,32,33,34,35'),
							5 => array('Bay 5','36,37,38,39,40,41,48'),
							6 => array('Bay 6','42,43,44,45,46,47,49')
						  ),
						  
				3 => array( 1 => array('Red','1,2,3,4,5,6,7'),
							2 => array('Green','8,9,10,11,12,13,14,15'),
							3 => array('Blue','16,17,18,19,20,21,22,23,24,25')
						  ),			  
						  
			
			
			
									
			),

);

// Format: Source name, icon, short source name
$baseSource = array(

	1 => array("A&E","/gfx/ae.png","A&E"),
	2 => array("GP","/gfx/gp.png","GP"),
	3 => array("Walk-in Centre","/gfx/wic.png","WIC"),
	4 => array("Outpatient","/gfx/hospital.png","OP"),
	5 => array("Other Hospital","","Oth")
	);

$baseTriage = array(
	1 => array("Red","D00000"),
	2 => array("Amber","FFBF00"),
	3 => array("Green","22BB22")
);
// 4 => array("Blue","0F52BA")

$baseStatus = array(
	0 => "Predicted",
	1 => "Accepted",
	2 => "Admitted",
	3 => "RIP",
	4 => "Discharged"
);

$baseDNAR = array(0 => "Yes",1 => "No"); // front-end shows 'Resuscitate'
$baseNLD = array(1 => "Yes",0 => "No");
$baseRxChange = array(1 => "Yes",0 => "No");
$baseBoard = array(1 => "Yes",0 => "No");
//	1 => array( "Doctor", "Red Stethoscope.png" ),
//	2 => array( "Staff Nurse", "Tensiometre.png" ),
$baseHandover = array(1 => "Yes",0 => "No");

// Format: referrer, icon 1,2,5,18
$baseAuthorRole = array(
	1 => array( "Doctor", "sdoctor.png" ),
	2 => array( "Staff Nurse", "snurse.png" ),
	3 => array( "Healthcare Assistant", "Napkin.png" ),
	4 => array( "Physiotherapist", "Shoe.png" ),
	5 => array( "Pharmacist", "Aspirin.png" ),
	6 => array( "Smoking Counsellor", "Cigarrette.png"),
	7 => array( "Dietitian", "Cup-Cake-icon.png"),
	8 => array( "Neurologist", "Marteau.png"),
	9 => array( "Occupational Therapist", "1309976378_wheelchair.png"),
	10 => array( "Cardiologist", "h3_128.png"),
	11 => array( "ENT", "Otoscope.png"),
	12 => array( "Diabetes Specialist Nurse", "Seringue.png"),
	13 => array( "Gastroenterologist", "beer-icon.png"),
	14 => array( "Social Worker", "sw.png"),
	15 => array( "Asthma Nurse", "asthma-inhaler-icon.png"),
		16 => array( "Photographer", "nikond40_front_256.png"),
		17 => array( "Respiratory physician", "resp.png"),
		18 => array("Consultant physician","Mallette.png"),
		19 => array("CrCU Outreach","fcat.png"),	
127 => array("Hospital at Night","moon.png")
	
);

//	5 => "Social Worker",
//	6 => "Occupational Therapist",
//	7 => "Asthma Specialist Nurse",
//	8 => "Diabetes Specialist Nurse",
//	9 => "Pharmacist"


$baseEOTBT = array(

1	=>	'Medically fit',
2	=>	'Palliative',
3	=>	'Stable',
4	=>	'Unwell',
5	=>	'Critically ill'


);

$basePathway = array(

1 => array('Cellulitis','cellulitis.pdf'),
2 => array('Asthma','asthma.pdf'),
3 => array('First seizure','seizure.pdf'),
4 => array('COPD exacerbation','COPD.pdf'),
5 => array('Low-risk chest pain','cp.pdf'),
6 => array('Headache','headache.pdf'),
7 => array('Pulmonary embolism','pe.pdf'),

);


$baseDischargeDest = array(
	1 => array( "Home", "Home" ),
	5 => array( "Other Hospital", "Other NHS" ),

	7 => array( "Died", "RIP" )
);

$drugUnits = array(

1 => array("g",'grams'),
2 => array("mg",'milligrams'),
3 => array("u",'units'),
4 => array("µg",'micrograms'),
5 => array("p",'puffs'),
5 => array("⚪",'tab/cap')

);

$drugFreq = array(

1 => array("od",'once daily'),
2 => array("bd",'twice daily'),
3 => array("tds",'three times a day'),
4 => array("qds",'four times a day'),
5 => array('q5d','five times a day'),
6 => array('q6d','six times a day')

);

$drugCD = array(

1 => "Yes",
0 => "No"

);

$drugTime = array(

1  => array("06",'6&thinsp;am'),
2  => array("09",'9&thinsp;am'),
4  => array("13",'1&thinsp;pm'),
8  => array("18",'6&thinsp;pm'),
16 => array("22",'10&thinsp;pm'),
32 => array("00",'12&thinsp;mn')

);

$drugReg = array(

1  => "daily",
2  => "weekly",
3  => "fortnightly",
4  => "monthly"

);

$drugRoute = array(

1 => array("Oral","po",'by mouth'),
2 => array("Topical","top",'topically'),
3 => array("Subling","sl",'sublingually'),
4 => array("Inhaled","inh",'inhaled'),
5 => array("Subcut","sc",'subcutaneously')

);

$drugAC = array(

1 => 'Chronic',
0 => 'Acute'

);

$clexane = array(

0 => 'None',
1 => '20 mg',
2 => '40 mg'

);

$oxTarget = array(

1 => '88-92%',
2 => '>94%'

);

$oxStart = array(

0 => '24%',
1 => '28%',
2 => '35%',
3 => '40%',
5 => 'NRB',
6 => 'NP',

);

$jobType = array(


1	=>	array("Blood",'gfx/ix/Syringe.png',array(

	1	=> 'FBC',	
	2	=> 'U&E',
	3	=> 'LFT',
	4	=> 'Bone',
	5	=> 'Magnesium',
	6	=> 'CRP',
	7	=> 'Troponin I',
	8	=> 'Glucose',
	9	=> 'Lipids',
	10	=> 'Thyroid',
	11	=> 'INR',
	12	=> 'Immunoglobulins'

),148),
2	=>	array("ECG",'gfx/ix/EKG_.png'),
3	=>	array("Ultrasound",'gfx/ix/wifi.png',array(

	1	=> 'Abdomen',	
	2	=> 'Pelvis',
	3	=> 'KUB',
	4	=> 'Thorax'



),120),
4	=>	array("Urine",'gfx/ix/urine.png'),
5	=>	array("X-ray",'gfx/ix/xray.png'),
6	=>	array("Appointment",'gfx/ix/cal.png'),
7	=>	array('Endoscopy','gfx/ix/leopard-fiber-optic-cable_128x128.png',array(

	1	=> 'Gastroscopy',	
	2	=> 'Colonoscopy',
	3	=> 'Sigmoidoscopy',
	4	=> 'Bronchoscopy',
	5	=> 'Nasendoscopy',
	6	=> 'Cystoscopy'



),136)

);






$jobStatus = array(

1  => "Required",
2  => "Booked",
4  => "Complete",
8  => "Checked",
16  => "Done"

);

$refStatus = array(

1  => "Pending",
2  => "In progress",
4  => "Complete"

);


$dischargeDest = array(

1  => "Home",
2  => "Butler Green",
3  => "Residential home",
4	=> 'Nursing home',
5	=> 'Another hospital',
6	=> 'Custody',
7	=> 'Died'

);

$bbCol = array(
1=> 'red',
2=> 'orange',
3=> 'green',
4=> 'orange',
5=>'transparent'

);

$frailtyScale=array(

1=>'Very fit',
2=>'Well',
3=>'Managing well',
4=>'Vulnerable',
5=>'Mildly frail',
6=>'Moderately frail',
7=>'Severely frail',
8=>'Very severely frail',
9=>'Terminally ill'

);

$mobilityScale=array(

1=>'Mobile',
2=>'Mobile with stick',
3=>'Mobile with frame',
4=>'Mobile with assistant',
5=>'Transfers',
6=>'Transfers with assistant',
7=>'Hoisted',
8=>'Bedbound',

);

$selfcareScale=array(

1=>'Self-caring',
2=>'Self-caring in bed',
3=>'Assistance',
4=>'Bed bathing only'

);


// Format: Score-section -> array; score-value:description[:age-cutoff]
$scs = array(

'Airway'=>array(
		'4:Coma',
		'2:SpO₂ ≤ 88% on air',
		'2:SpO₂ ≤ 94% on O₂',
		'1:SpO₂ ≥ 88% and ≤ 94%'
		),
'Breathing'=>array(
		'2:Respirations > 30/min',
		'1:Respirations > 20/min',
		'1:Breathless'
		),
'Circulation'=>array(
		'4:Systolic < 70 mmHg',
		'3:Systolic ≤ 80 mmHg',
		'2:Systolic ≤ 100 mmHg',
		'2:Pulse > Systolic'
		),
'Disability'=>array(
		'3:Stroke',
		'2:Altered mental status:50',
		'2:Unable to stand',
		'2:Nursing home resident',
		'2:Prior illness- part of day in bed',
		'1:Diabetes (Type I or II)'
		),
'ECG'=>array(
		'2:Abnormal ECG'	
		),
'Fever'=>array(
		'2:Temperature < 35°C or ≥ 39°C'
		)


);

// $scs = array(
// 
// 'Airway'=>array(
// 		'4:Coma',
// 		'2:SpO₂ < 90% RA or < 95% on O₂',
// 		'1:SpO₂ ≥ 90% and < 95%'
// 		),
// 'Breathing'=>array(
// 		'2:RR > 30/min',
// 		'1:RR > 20/min and ≤ 30/min',
// 		'1:Breathless'
// 		),
// 'Circulation'=>array(
// 		'4:SBP < 70mmHg',
// 		'3:SBP > 70mmHg and ≤ 80mmHg',
// 		'2:SBP > 80mmHg and ≤ 100mmHg',
// 		'2:Pulse > SBP'
// 		),
// 'Disability'=>array(
// 		'3:Stroke',
// 		'2:Altered mental status:50',
// 		'2:Unable to stand or NH resident',
// 		'2:Prior illness- some part of day in bed',
// 		'1:Diabetes'
// 		),
// 'ECG'=>array(
// 		'2:Abnormal ECG'	
// 		),
// 'Fever'=>array(
// 		'2:Temperature < 35°C or ≥ 39°C'
// 		)
// 
// 
// );



$documentTypes = array(

1 => array('Clerking',"Clerking document"),
2 => array('Discharge',"Discharge summary"),
3 => array('Notes',"Progress notes"),
4 => array('Patient\'s info','Patient-held admission information')

);

$followupTypes = array(

1 => 'Not required',
2 => 'With general practitioner',
3 => 'Existing clinic appointment',
4 => 'Ambulatory Assessment Unit',

10 => 'To be arranged'

);





?>