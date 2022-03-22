import fs from 'fs';
import path from 'path';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import ffmpeg from 'fluent-ffmpeg';
import setFfmpeg from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(setFfmpeg.path);

export {
  recognizeSpeech,
  mp4ConvertToWav
};

// const speechConfig = sdk.SpeechConfig.fromSubscription("<paste-your-speech-key-here>", "<paste-your-speech-location/region-here>");

function recognizeSpeech(waveFileName, callback) {
  const folderPath = path.join(__dirname, "../public/test/OPT_TEST.txt");
  let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(folderPath));
  let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognizeOnceAsync(result => {
      console.log(`RECOGNIZED: Text=${result.text}`);
      recognizer.close();
      return callback && callback(null)
  });
}

function mp4ConvertToWav(trackFileName, callback) {
  const trackFolderPath = path.join(__dirname, "../public/test/TEST______GMT20200615-054429_FET_2020-06-15T05-44-24-924Z_640x360.mp4");
  const wavFolderPath = path.join(__dirname, "../public/test/helloTEST.wav");
  console.log('mp4ConvertToWav START!! trackFolderPath:', trackFolderPath);
  ffmpeg(trackFolderPath)
  .toFormat('wav')
  .on('error', (err) => {
    console.log('An error occurred: ' + err.message);
  })
  .on('progress', (progress) => {
    // console.log(JSON.stringify(progress));
    console.log('Processing: ' + progress.targetSize + ' KB converted');
  })
  .on('end', () => {
    console.log('Processing finished !');
    return callback && callback(null)
  })
  .save(wavFolderPath);//path where you want to save your file
}
