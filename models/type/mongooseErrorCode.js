export const errorCode = {
	'TokenExpiredError': ['10010','token expired','憑證過期'],
	'RefreshTokenExpiredError': ['10011','refresh token expired','刷新憑證過期'],
	'JsonWebTokenError': ['10020','token error','憑證錯誤'],
	'RepeatSignup':        ['10042','this account is repeatedly signup','此號碼已被註冊過'],
	'RepeatPersonalIdSignup':        ['10043','this personalId is repeatedly signup','此身分證已被使用過'],
	'AuthenticateError': ['10030','login first please','請登入'],
	'LoginError':        ['10040','account or password not match','帳號或密碼錯誤，請重新輸入'],
	'RepeatLogin':        ['10041','this account is repeatedly login','此帳號重複登入'],
	'PermissionDeniedError': ['10050','permission denied error','沒有權限'],
	'VerifyCodeError': ['10060','verify code is error','驗證碼錯誤'],

	'ParamMalformedError': ['30010','parameter is missing or malformed','輸入參數缺失或格式錯誤'],
	'NoMessageData':       ['30020','no message data','沒有訊息資料'],
	
	'CreateError':    ['50010','create data failed','資料建立錯誤'],
	'UpdateError':    ['50011','update data failed','資料更新錯誤'],
	'DataExists':     ['50020','data exists(unique)','資料已存在'],
	'OldPasswordError':  ['30030','old password not match','舊密碼錯誤'],

	'DataNotFound':   ['50030','data not found','找不到資料'],
	'OutpatientNotFound':   ['50031','the outpatient not found','沒有門診資料'],
	'CustomerNotFound':   ['500311','the customer not found','沒有此病患資料'],
	'CompanyNotFound':   ['500311','the company not found','沒有此醫院資料'],
	'NoUserEmail':   ['50032','no user email','無使用者信箱'],

	'ClientOffLine':   ['50040','the client is off line','不在線上'],
	'ShareClientOffLine':   ['50041','the share client is off line','分享端不在線上'],

	'RepeatAppointment':   ['50050','user repeat appointment','重複掛號'],
	'MWRegisterErr':   ['50051','middleware register err','MW掛號失敗'],
	'MWCancelRegisterErr':   ['50052','middleware cancel register err','MW取消掛號失敗'],
	'ParamMissForRegister':   ['50053','parameter is missing for register','掛號資料缺失, 檢查身分證或生日'],
	'HospitalNoThisOutpatient':   ['50054','hospital no this outpatient','醫院端無此門診'],
	'NeedFirstRegister':   ['50055','need first register or personID/birthday is missing','須完成初診或證號/生日不符'],
	'OptTimeOverlap':   ['50056','outpatient time overlap','門診時間重疊'],
	'RepeatReserveMeetingTime':   ['50057','repeat reserve meeting time','預約時間重複'],

	'ZoomErr':   ['50060','zoom response error','Zoom 錯誤回應'],
	'VidyoErr':   ['50070','Vidyo response error','Vidyo 錯誤回應'],
	'VidyoStatusErr':   ['50071','Vidyo response status not 200','Vidyo 回應狀態非200'],
	'NoMeetingAccount':   ['50071','No meeting account available','沒有可用的診間帳號'],
	'NoZoomAccount':   ['50061','No zoom account available','沒有可用的Zoom帳號'],
	'NoLiveMeeting':   ['50062','No live meeting room','沒有進行中的診間'],
	'InMeeting':   ['50063','User is in a meeting','正在看診中'],
	'RoomsExceedLimit':  ['50065','Meeting rooms are exceed usage limit','可使用的診間數量已達限制'],
	'NoRecordingFile':   ['50064','No recording file','沒有看診記錄檔案'],
	'XMPPNoResponse':   ['50080','XMPP server no response','XMPP 無回應'],
	'XMPPSendErr':   ['50080','XMPP send msg error','XMPP 傳訊息錯誤'],

	'DpayOAuthNoData': ['51010','OAuth no response data','OAuth 無回傳資料'],
	'DpayGetConfigIDErr': ['51020','getConfigID no response data','getConfigID 無回傳資料'],

	'ReferenceError': ['99999','internal server error','內部服務器錯誤'],
};

export default function(error) {
	if (error.code || error.name) {
		let errMsg = errorCode[error.code];
		if (errMsg) return [{system: {message: errMsg[1]}}, errMsg[0], errMsg[1], errMsg[2]];
		errMsg = errorCode[error.name];
		if (errMsg) return [{system: {message: errMsg[1]}}, errMsg[0], errMsg[1], errMsg[2]];
		errMsg = error.toString();
		return [{system: {message: errMsg}}, errorCode['ReferenceError'][0], errorCode['ReferenceError'][1], errorCode['ReferenceError'][2]];
	} else if(error.printMsg){
    return [{system: {message: error.printMsg}}, error.printMsg, error.printMsg, error.printMsg];
	} else {
		Object.keys(error).forEach(key => {
			let v = error[key];
			v.el = undefined;
			v.id = undefined;
			v.name = undefined;
			v.rule = undefined;
			v.clazz = undefined;
			v.placeId = undefined;
		});
		return [error, errorCode['ParamMalformedError'][0],errorCode['ParamMalformedError'][1],errorCode['ParamMalformedError'][2]];
	}
}
