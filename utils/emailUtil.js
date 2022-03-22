import nodemailer from 'nodemailer';
import config from 'nconf';

export {
  sendMail, 
  sendMailAndSetSubject
}

const target = config.get('EXECUTE_TARGET');
const emailServerConfig = config.get(target).MAILSERVER; 

/**
 * Goal. 透過全域參數EXECUTE_TARGET，設定email server config。
 * Annotator. Jack Hu.
 * Date. 20211207
 *  
 */
let transporter = nodemailer.createTransport({
  host: emailServerConfig.HOST,
  sender: emailServerConfig.SENDER,
  port: emailServerConfig.PORT,
  auth: {
    user: emailServerConfig.USER, 
    pass: emailServerConfig.PASS,
  },
  tls: {
    rejectUnauthorized: emailServerConfig.TLS_REJECTUNAUTHORIZED
  },
  secure: emailServerConfig.SECURE
});

// let transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//       // user: 'owlchtechb@gmail.com',
//       // pass: 'a055437754'
//       user: "jack.hu.fet@gmail.com",
//       pass: ""
//   },
//   tls: {
//       rejectUnauthorized: false
//   }
// });


// let testAccount = nodemailer.createTestAccount();

// create reusable transporter object using the default SMTP transport
// let transporter = nodemailer.createTransport({
//   host: "pop3.ethereal.email",
//   port: 995,
//   secure: true, // true for 465, false for other ports
//   auth: {
//     user: testAccount.user, // generated ethereal user
//     pass: testAccount.pass, // generated ethereal password
//   },
//   tls: {
//     rejectUnauthorized: false
//   }
// });

/**
 * Goal. 驗證並檢查email server是否能使用。
 * Annotator. Jack Hu
 * Date. 20211207
 * 
 * @returns {Boolean}
 * 
 */
async function isEmailServerReady() {
  console.log(`##### Check Email Server Config #####`);
  console.log(`##### host: ${emailServerConfig.HOST}`);
  console.log(`##### sender: ${emailServerConfig.SENDER}`);
  console.log(`##### port: ${emailServerConfig.PORT}`);
  console.log(`##### secure: ${emailServerConfig.SECURE}`);
  console.log(`##### tls_rejectUnauthorized: ${emailServerConfig.TLS_REJECTUNAUTHORIZED}`);

  transporter.verify((error) => {
    if (error) {
      console.log(error);
      return false;
    } 

    console.log(`##### Email server is Ready.`)
    return true;
  });
}

function sendMail(mail, name, content, callback) {
  console.log("##### Sending mail...");
  console.log("##### To: " + mail);
  console.log("##### Name: " + name);
  //console.log("##### testAccount:", testAccount);
  if (isEmailServerReady) {
    let mailOptions = {
      from: '"遠距醫療" <teleadmin11@healthplus.tw>',
      to: mail,
      subject: '遠距醫療--會診影片檔連結通知信',
      text: 'Hi ' +name+ ', ' +content,
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info)=>{
      if(error){
        console.log('Fail to send mail! Error: ' + error);
        callback(false);
        return;
      }
      console.log('Mail sent: ' + info.response);
      callback(true);
    });
  } 
  else {
    callback(false);
  }
}

/**
 * Goal. email通知相關維運人員，有關信件主旨及內文均可自行設定。
 * Annotator. Jack Hu
 * Date. 20211207
 * 
 * @param {String} mail -> 收件者 
 * @param {String} subject -> 主旨 
 * @param {String} content -> 內文，只能放至text。 
 * @param {Function} callback
 * 
 */
function sendMailAndSetSubject(mail, subject, content, callback) {
  console.log("##### Sending mail...");
  console.log("##### To: " + mail);
  console.log("##### Subject: " + subject);
  //console.log("##### testAccount:", testAccount);
  
  if(isEmailServerReady()) {
    let mailOptions = {
      from: `"遠距醫療" <${emailServerConfig.SENDER}>`,
      to: mail,
      subject: subject,
      text: `Dear Mr./Mrs. \n${content}`,
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if(error) {
        console.log('Fail to send mail! Error: ' + error);
        callback(false);
        return;
      }
      console.log('Mail sent: ' + info.response);  
      callback();
    }); 
  } else {
    callback(false);
  }    
}