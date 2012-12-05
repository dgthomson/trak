#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Script Python Example
import time
import sys
 
print "Initializing Python Script"
 
print "The passed arguments are ", sys.argv
 
print "Writing lines to a file"
 
ifile = open( "/tmp/testfile", "w+")
for i in range(0,100):
 ifile.write( "One of the lines of the filen" )
 print "Printing line ",i," to /tmp/testfile"
 
ifile.close()
 
print "Reading and printing lines of /tmp/testfile"
ifile = open( "/tmp/testfile", "r")
for line in ifile:
 print line
ifile.close()
print "End of Python Script"