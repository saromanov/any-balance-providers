/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://bananawars.ru/index.php';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		password: prefs.password,
		'Remember': 'false'
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /error.gif[\s\S]*?<td>\s(\W+)<\/td>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Введите логин и пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'level', /Уровень:[\s\S]*?(\d+)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'boosters', /Бустеры:[\s\S]*?(\d+)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'money', /Деньги:[\s\S]*?(\d+)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'mail', /Почта:[\s\S]*?(\d+)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'scores', /Очки:[\s\S]*?(\d+)<\/a>/i,replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}