@REM ----------------------------------------------------------------------------
@REM Copyright 2001-2004 The Apache Software Foundation.
@REM
@REM Licensed under the Apache License, Version 2.0 (the "License");
@REM you may not use this file except in compliance with the License.
@REM You may obtain a copy of the License at
@REM
@REM      http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing, software
@REM distributed under the License is distributed on an "AS IS" BASIS,
@REM WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@REM See the License for the specific language governing permissions and
@REM limitations under the License.
@REM ----------------------------------------------------------------------------
@REM

@echo off

set ERROR_CODE=0

:init
@REM Decide how to startup depending on the version of windows

@REM -- Win98ME
if NOT "%OS%"=="Windows_NT" goto Win9xArg

@REM set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" @setlocal

@REM -- 4NT shell
if "%eval[2+2]" == "4" goto 4NTArgs

@REM -- Regular WinNT shell
set CMD_LINE_ARGS=%*
goto WinNTGetScriptDir

@REM The 4NT Shell from jp software
:4NTArgs
set CMD_LINE_ARGS=%$
goto WinNTGetScriptDir

:Win9xArg
@REM Slurp the command line arguments.  This loop allows for an unlimited number
@REM of arguments (up to the command line limit, anyway).
set CMD_LINE_ARGS=
:Win9xApp
if %1a==a goto Win9xGetScriptDir
set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
shift
goto Win9xApp

:Win9xGetScriptDir
set SAVEDIR=%CD%
%0\
cd %0\..\.. 
set BASEDIR=%CD%
cd %SAVEDIR%
set SAVE_DIR=
goto repoSetup

:WinNTGetScriptDir
set BASEDIR=%~dp0\..

:repoSetup


if "%JAVACMD%"=="" set JAVACMD=java

if "%REPO%"=="" set REPO=%BASEDIR%\repo

set CLASSPATH="%BASEDIR%"\etc;"%REPO%"\org\apache\tomcat\embed\tomcat-embed-core\7.0.57\tomcat-embed-core-7.0.57.jar;"%REPO%"\org\apache\tomcat\embed\tomcat-embed-logging-juli\7.0.57\tomcat-embed-logging-juli-7.0.57.jar;"%REPO%"\org\apache\tomcat\embed\tomcat-embed-jasper\7.0.57\tomcat-embed-jasper-7.0.57.jar;"%REPO%"\org\apache\tomcat\embed\tomcat-embed-el\7.0.57\tomcat-embed-el-7.0.57.jar;"%REPO%"\org\apache\tomcat\tomcat-jasper\7.0.57\tomcat-jasper-7.0.57.jar;"%REPO%"\org\apache\tomcat\tomcat-servlet-api\7.0.57\tomcat-servlet-api-7.0.57.jar;"%REPO%"\org\apache\tomcat\tomcat-juli\7.0.57\tomcat-juli-7.0.57.jar;"%REPO%"\org\apache\tomcat\tomcat-el-api\7.0.57\tomcat-el-api-7.0.57.jar;"%REPO%"\org\apache\tomcat\tomcat-api\7.0.57\tomcat-api-7.0.57.jar;"%REPO%"\org\apache\tomcat\tomcat-util\7.0.57\tomcat-util-7.0.57.jar;"%REPO%"\org\apache\tomcat\tomcat-jasper-el\7.0.57\tomcat-jasper-el-7.0.57.jar;"%REPO%"\org\apache\tomcat\tomcat-jsp-api\7.0.57\tomcat-jsp-api-7.0.57.jar;"%REPO%"\org\apache\velocity\velocity\1.7\velocity-1.7.jar;"%REPO%"\commons-collections\commons-collections\3.2.1\commons-collections-3.2.1.jar;"%REPO%"\commons-lang\commons-lang\2.4\commons-lang-2.4.jar;"%REPO%"\org\codehaus\jackson\jackson-mapper-asl\1.9.6\jackson-mapper-asl-1.9.6.jar;"%REPO%"\org\codehaus\jackson\jackson-core-asl\1.9.6\jackson-core-asl-1.9.6.jar;"%REPO%"\com\google\code\gson\gson\2.2.4\gson-2.2.4.jar;"%REPO%"\com\aranya\Aranya-KayaCommon\3.0.1-SNAPSHOT\Aranya-KayaCommon-3.0.1-SNAPSHOT.jar;"%REPO%"\commons-io\commons-io\1.4\commons-io-1.4.jar;"%REPO%"\commons-beanutils\commons-beanutils\1.8.0\commons-beanutils-1.8.0.jar;"%REPO%"\commons-logging\commons-logging\1.1.1\commons-logging-1.1.1.jar;"%REPO%"\javax\mail\mail\1.4\mail-1.4.jar;"%REPO%"\javax\activation\activation\1.1\activation-1.1.jar;"%REPO%"\org\vedantatree\expressionoasis\ExpressionOasis\2.3\ExpressionOasis-2.3.jar;"%REPO%"\org\vedantatree\utilities\1.1\utilities-1.1.jar;"%REPO%"\org\simpleframework\simple-xml\2.3.6\simple-xml-2.3.6.jar;"%REPO%"\stax\stax-api\1.0.1\stax-api-1.0.1.jar;"%REPO%"\stax\stax\1.2.0\stax-1.2.0.jar;"%REPO%"\org\javassist\javassist\3.16.1-GA\javassist-3.16.1-GA.jar;"%REPO%"\com\aranya\Aranya-KayaServer\3.0.1-SNAPSHOT\Aranya-KayaServer-3.0.1-SNAPSHOT.jar;"%REPO%"\bouncycastle\bcprov-jdk15\137\bcprov-jdk15-137.jar;"%REPO%"\bouncycastle\bcpg-jdk15\137\bcpg-jdk15-137.jar;"%REPO%"\commons-dbcp\commons-dbcp\1.2.2\commons-dbcp-1.2.2.jar;"%REPO%"\commons-pool\commons-pool\1.4\commons-pool-1.4.jar;"%REPO%"\c3p0\c3p0\0.9.1.2\c3p0-0.9.1.2.jar;"%REPO%"\org\springframework\spring-context\3.1.1.RELEASE\spring-context-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-aop\3.1.1.RELEASE\spring-aop-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-beans\3.1.1.RELEASE\spring-beans-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-core\3.1.1.RELEASE\spring-core-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-expression\3.1.1.RELEASE\spring-expression-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-asm\3.1.1.RELEASE\spring-asm-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-web\3.1.1.RELEASE\spring-web-3.1.1.RELEASE.jar;"%REPO%"\aopalliance\aopalliance\1.0\aopalliance-1.0.jar;"%REPO%"\org\springframework\spring-webmvc\3.1.1.RELEASE\spring-webmvc-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-context-support\3.1.1.RELEASE\spring-context-support-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\security\spring-security-core\3.1.1.RELEASE\spring-security-core-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\security\spring-security-web\3.1.1.RELEASE\spring-security-web-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-jdbc\3.1.1.RELEASE\spring-jdbc-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\spring-tx\3.1.1.RELEASE\spring-tx-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\security\spring-security-taglibs\3.1.1.RELEASE\spring-security-taglibs-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\security\spring-security-acl\3.1.1.RELEASE\spring-security-acl-3.1.1.RELEASE.jar;"%REPO%"\org\springframework\security\spring-security-config\3.1.1.RELEASE\spring-security-config-3.1.1.RELEASE.jar;"%REPO%"\commons-codec\commons-codec\1.6\commons-codec-1.6.jar;"%REPO%"\org\slf4j\slf4j-api\1.5.6\slf4j-api-1.5.6.jar;"%REPO%"\org\slf4j\slf4j-log4j12\1.5.6\slf4j-log4j12-1.5.6.jar;"%REPO%"\log4j\log4j\1.2.14\log4j-1.2.14.jar;"%REPO%"\com\secwebservices\PersonalFinanceManager-Application\0.0.1-SNAPSHOT\PersonalFinanceManager-Application-0.0.1-SNAPSHOT.jar
set EXTRA_JVM_ARGUMENTS=
goto endInit

@REM Reaching here means variables are defined and arguments have been captured
:endInit

%JAVACMD% %JAVA_OPTS% %EXTRA_JVM_ARGUMENTS% -classpath %CLASSPATH_PREFIX%;%CLASSPATH% -Dapp.name="PersonalFinance" -Dapp.repo="%REPO%" -Dbasedir="%BASEDIR%" com.secwebservices.personalfinance.PersonalFinanceManager %CMD_LINE_ARGS%
if ERRORLEVEL 1 goto error
goto end

:error
if "%OS%"=="Windows_NT" @endlocal
set ERROR_CODE=1

:end
@REM set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" goto endNT

@REM For old DOS remove the set variables from ENV - we assume they were not set
@REM before we started - at least we don't leave any baggage around
set CMD_LINE_ARGS=
goto postExec

:endNT
@endlocal

:postExec

if "%FORCE_EXIT_ON_ERROR%" == "on" (
  if %ERROR_CODE% NEQ 0 exit %ERROR_CODE%
)

exit /B %ERROR_CODE%
