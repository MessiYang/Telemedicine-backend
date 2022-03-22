import moment from 'moment';
import OutpatientTimeType from '../models/type/outpatientTimeType';
import OutpatientType from '../models/type/outpatientType';

export function demandStartTimeDate(time, range){
  if (!time) {
  time = new Date();
  //console.log('queryDate = ', queryDate);
  }
  if (!range) {
    range = 0;
  }
  let timeDate = new Date(time);
  let startDate = new Date(timeDate).setDate(timeDate.getDate() - range);
  return  new Date(startDate);
}

export function getUTCOffsetMins(){
  return moment().utcOffset();
}

export function judgeOPTimeType(time){
  let hour = moment(time).format("H");
  if(hour>=0 && hour<12){
    return OutpatientTimeType.MORNING.value
  }else if(hour>=12 && hour<18){
    return OutpatientTimeType.AFTERNOON.value
  }else{
    return OutpatientTimeType.NIGHT.value
  }
}

export function checkRecordFilesDownloadTimeLimit(filename){
  let textParts = filename.split('_');
  console.log(textParts);
  let fileLimitDate = moment(textParts[0], "x").add(3, 'days');
  console.log("[checkRecordFilesDownloadTimeLimit] fileLimitDate:", fileLimitDate.toString());
  console.log("[checkRecordFilesDownloadTimeLimit] now:", moment(new Date()).toString());
  let result = moment(new Date()).isBefore(fileLimitDate);
  console.log("[checkRecordFilesDownloadTimeLimit] result:", result);
  return result
}


export function dateToNoonNo(companyCode, date){
  let result;
  let taiwanTimeHour = moment(date).utc().add(8, 'hours').hours()   //0~23
  console.log("[dateToNoonNo] taiwanTimeHour:", taiwanTimeHour);
  switch (companyCode) {
    case 'FEMH':
      if(taiwanTimeHour>=5 && taiwanTimeHour<12){
        result = "1";
      }else if(taiwanTimeHour>=12 && taiwanTimeHour<17){
        result = "2";
      }else{
        result = "3";
      }
    break;
    case 'KMUH':
      if(taiwanTimeHour>=5 && taiwanTimeHour<12){
        result = "0";
      }else if(taiwanTimeHour>=12 && taiwanTimeHour<17){
        result = "1";
      }else{
        result = "2";
      }
    break;
    default:
      if(taiwanTimeHour>=5 && taiwanTimeHour<12){
        result = "1";
      }else if(taiwanTimeHour>=12 && taiwanTimeHour<17){
        result = "2";
      }else{
        result = "3";
      }
  }
  return result
}

export function noonNoToHHMM(companyCode, noonNo){
  let result;
  switch (companyCode) {
    case 'FEMH':
      if(noonNo == "1"){
        result = "09:00";
      }else if(noonNo == "2"){
        result = "14:00";
      }else{
        result = "17:30";
      }
    break;
    case 'KMUH':
      if(noonNo == "0"){
        result = "09:00";
      }else if(noonNo == "1"){
        result = "14:00";
      }else{
        result = "17:30";
      }
    break;
    default:
      if(noonNo == "1"){
        result = "09:00";
      }else if(noonNo == "2"){
        result = "14:00";
      }else{
        result = "17:30";
      }
  }
  return result
}

export function suggestTimeToExpectedStartTime(companyCode, date ,suggestTime){
  let result, suggestTimeSplit, timeString, utcTime;
  console.log("[suggestTimeToExpectedStartTime] companyCode:", companyCode);
  console.log("[suggestTimeToExpectedStartTime] date:", date);
  console.log("[suggestTimeToExpectedStartTime] suggestTime:", suggestTime);
  if(!companyCode||!date||!suggestTime) return null
  //suggestTime: '16:40-16:50'
  switch (companyCode) {
    case 'FEMH':
      suggestTimeSplit = suggestTime.split('-');
      timeString = date +" "+ suggestTimeSplit[0] +"+08:00";
      console.log("[suggestTimeToExpectedStartTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[suggestTimeToExpectedStartTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    case 'HLM':
      suggestTimeSplit = suggestTime.split('-');
      timeString = date +" "+ suggestTimeSplit[0] +"+08:00";
      console.log("[suggestTimeToExpectedStartTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[suggestTimeToExpectedStartTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    case 'KMUH':
      suggestTimeSplit = suggestTime.split('-');
      timeString = date +" "+ suggestTimeSplit[0] +"+08:00";
      console.log("[suggestTimeToExpectedStartTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[suggestTimeToExpectedStartTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    default:
      suggestTimeSplit = suggestTime.split('-');
      timeString = date +" "+ suggestTimeSplit[0] +"+08:00";
      console.log("[suggestTimeToExpectedStartTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[suggestTimeToExpectedStartTime] utcTime:", utcTime.toDate());
      result = utcTime; 
  }
  return result
}

export function getQueryStartTime(companyCode, regDateTime, noonNo){
  let result, timeString, utcTime, startHour;
  if(!companyCode||!regDateTime||!noonNo) return null
  if(noonNo == "1"){
    startHour = "05:00";
  }else if(noonNo == "2"){
    startHour = "12:00";
  }else{
    startHour = "17:00";
  }
  let startDay = regDateTime.split(' ');
  startDay = startDay[0] 
  console.log("[getQueryStartTime] companyCode:", companyCode);
  console.log("[getQueryStartTime] startDay:", startDay);
  console.log("[getQueryStartTime] startHour:", startHour);
  switch (companyCode) {
    case 'FEMH':    
      timeString = startDay +" "+ startHour +"+08:00";
      console.log("[getQueryStartTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[getQueryStartTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    case 'HLM':
      timeString = startDay +" "+ startHour +"+08:00";
      console.log("[getQueryStartTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[getQueryStartTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    case 'KMUH':
      timeString = startDay +" "+ startHour +"+08:00";
      console.log("[getQueryStartTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[getQueryStartTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    default:
      timeString = startDay +" "+ startHour +"+08:00";
      console.log("[getQueryStartTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[getQueryStartTime] utcTime:", utcTime.toDate());
      result = utcTime; 
  }
  return result
}

export function getQueryEndTime(companyCode, regDateTime, noonNo){
  let result, timeString, utcTime, endHour;
  if(!companyCode||!regDateTime||!noonNo) return null
  if(noonNo == "1"){
    endHour = "12:00";
  }else if(noonNo == "2"){
    endHour = "17:00";
  }else{
    endHour = "24:00";
  }
  let day = regDateTime.split(' ');
  day = day[0] 
  switch (companyCode) {
    case 'FEMH':    
      timeString = day +" "+ endHour +"+08:00";
      console.log("[getQueryEndTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[getQueryEndTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    case 'HLM':
      timeString = day +" "+ endHour +"+08:00";
      console.log("[getQueryEndTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[getQueryEndTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    case 'KMUH':
      timeString = day +" "+ endHour +"+08:00";
      console.log("[getQueryEndTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[getQueryEndTime] utcTime:", utcTime.toDate());
      result = utcTime; 
    break;
    default:
      timeString = day +" "+ endHour +"+08:00";
      console.log("[getQueryEndTime] timeString:", timeString);
      utcTime = moment(timeString, "YYYY-MM-DD HH:mmZZ");
      console.log("[getQueryEndTime] utcTime:", utcTime.toDate());
      result = utcTime; 
  }
  return result
}

export function checkCommunicateStartTimeStatus(appointment, doctor) {
  if(!appointment.vidyoRoomUrl && moment().isBefore(moment(appointment.expectedStartTime).subtract(15, 'm')))
    return OutpatientType.UPCOMING.value
  if(!appointment.vidyoRoomUrl)
    return OutpatientType.READY.value
  if(appointment.vidyoRoomUrl && appointment.vidyoRoomUrl==doctor.currentVidyoRoomUrl)
    return OutpatientType.LIVING.value
  if(appointment.vidyoRoomUrl && appointment.vidyoRoomUrl!=doctor.currentVidyoRoomUrl)
    return OutpatientType.END.value
}

export function checkMeetingStartTimeout(meetingStartTime, timeoutMin){
  if(moment().isAfter(moment(meetingStartTime).add(timeoutMin, 'm'))) return true
  return false
}