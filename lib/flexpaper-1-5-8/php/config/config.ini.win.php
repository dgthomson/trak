; <?php exit; ?> DO NOT REMOVE THIS LINE
[requirements]
 test_pdf2swf				= true
 test_pdf2json				= false

[general]
 allowcache 				= true
 splitmode					= false
 path.pdf 					= "C:\inetpub\wwwroot\flexpaper\php\pdf\"
 path.swf 					= "C:\inetpub\wwwroot\flexpaper\php\docs\"
 
[external commands]
 cmd.conversion.singledoc 	= "pdf2swf.exe \"{path.pdf}{pdffile}\" -o \"{path.swf}{pdffile}.swf\" -f -T 9 -t -s storeallcharacters"
 cmd.conversion.splitpages 	= "pdf2swf.exe \"{path.pdf}{pdffile}\" -o \"{path.swf}{pdffile}%.swf\" -f -T 9 -t -s storeallcharacters -s linknameurl"
 cmd.searching.extracttext 	= "swfstrings.exe \"{path.swf}{swffile}\""
