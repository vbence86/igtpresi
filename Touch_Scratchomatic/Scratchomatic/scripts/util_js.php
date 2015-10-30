<?
	include_once($_SERVER['DOCUMENT_ROOT'].'/../conf/conf.php');
	// TODO The following lines are needed to be commented before they have been released on Dev
	header('Expires: Sat, 1 Jan 2005 00:00:00 GMT');
	header('Last-Modified: '.gmdate( 'D, d M Y H:i:s').'GMT');
	header('Cache-Control: no-cache, must-revalidate');
	header('Content-Type: text/javascript; charset=utf-8');
	header('Pragma: no-cache');

	echo '/*'.PHP_EOL;
	echo '--Loading files'.PHP_EOL;
    echo '-- '.$_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'UserData.js'.PHP_EOL;
	echo '-- '.$_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'i18n.js'.PHP_EOL;
	echo '-- '.$_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'framework.js'.PHP_EOL;
	echo '-- '.$_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'porting.js'.PHP_EOL;
	echo '-- '.$_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'MenuUtil.js'.PHP_EOL;
	echo '-- '.$_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'DOMUtil.js'.PHP_EOL;
	echo '-- '.$_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'XHR.js'.PHP_EOL;
	echo '*/'.PHP_EOL;

    include_once($_SERVER["DOCUMENT_ROOT"]."/lib/util/".$jsDir."UserData.js");
	include_once($_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'i18n.js');
	include_once($_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'porting.js');
	include_once($_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'framework.js');
	include_once($_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'MenuUtil.js');
	include_once($_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'DOMUtil.js');
	include_once($_SERVER['DOCUMENT_ROOT'].'/lib/util/'.$jsDir.'XHR.js');

?>