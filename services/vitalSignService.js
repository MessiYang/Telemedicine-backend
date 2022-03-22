export {
  getLatestData
};

function getLatestData(bean, callback) {
  let {output} = bean;
  let data = {};

  data.latestVitalSign = {
    'age': 62,
    'weight': 60,
    'height': 160,
    'systolicBloodPressure': 120,
    'diastolicBloodPressure': 80,
    'heartBeat': 72,
    'bodyTemperature': 36.5,
    'drugAllergy': null,
    'majorMedicalRecord': null
  }

  output.result = data;
  return callback && callback(null);
}