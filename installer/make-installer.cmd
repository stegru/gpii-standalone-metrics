
call :clean

rmdir /q /s output
mkdir output


candle -out filebeat.wixobj filebeat.wxs

light filebeat.wixobj -sacl -o output/filebeat.msm


:clean
del  *.wixobj output\*.wixpdb 2>nul


