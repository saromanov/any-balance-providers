﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurlLogin = 'https://login.dnevnik.ru/login';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurlLogin, g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});
	
	try {
		html = AnyBalance.requestPost(baseurlLogin, params, addHeaders({Referer: baseurlLogin}));
	} catch(e) {
		html = AnyBalance.requestGet('http://dnevnik.ru/user/', g_headers);
	}
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="message\s*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка в логине или пароле/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	if(prefs.id) {
		AnyBalance.trace('Ищем дневник ребенка с идентификатором ' + prefs.id);
		html = AnyBalance.requestGet('http://children.dnevnik.ru/marks.aspx?child=' + prefs.id, g_headers);
	} else {
		AnyBalance.trace('Идентификатор ребенка не указан, ищем без него');
		var href = getParam(html, null, null, /<a href="(https?:\/\/schools[^"]+)[^>]*>\s*Мой дневник/i);
		checkEmpty(href, 'Не удалось найти ссылку на оценки, сайт изменен?', true);
		html = AnyBalance.requestGet(href, g_headers);
	}
	
	var result = {success: true};
	
	//<a\s*class="strong\s*" title="[^"]+" href="http://(?:schools|children).dnevnik.ru/lesson.aspx(?:[^>]*>){15,20}</tr>
	var regLesson = '<a\\s*class="strong\\s*" title="[^"]+" href="https?://(?:schools|children).dnevnik.ru/lesson.aspx(?:[^>]*>){15,30}</tr>';
	// Бывает от 1 до 6 уроков
	//var regDay = new RegExp('<div class="panel blue2 clear">(?:[\\s\\S]*?' + regLesson + '){1,6}', 'ig');

	var regDay = new RegExp('<div class="panel blue2 clear">[^]+?<table class="grid vam marks">[^]*?<\/table>', 'ig');
	var days = sumParam(html, null, null, regDay);
	
	for(var i = 0; i < days.length; i++) {
		var currentDay = days[i];
		
		var day = getParam(currentDay, null, null, /<h3>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
		if(!day)
			continue;

		var lessons = sumParam(currentDay, null, null, new RegExp(regLesson, 'ig'));
		
		var total = '<b>' + day + '</b><br/>';
		var totalLessons = '';
		
		for(var z = 0; z < lessons.length; z++) {
			var currentLesson = lessons[z];
			
			var name = getParam(currentLesson, null, null, /title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
			var mark = getParam(currentLesson, null, null, /class="mark([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
			if(mark && name) {
				totalLessons += name + ': ' + mark + '<br/>';
			}
			//total += name + (mark ? ': ' + mark : 'нет оценок') + '<br/>';
		}
		if(totalLessons != '')
			getParam('<b>' + day + '</b><br/><br/>' + totalLessons, result, 'total' + i);
	}
	
	getParam(html, result, 'fio', /header-profile__name[^>]+>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}