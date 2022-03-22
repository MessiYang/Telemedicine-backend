// import routes from '../react/routes';
import dir from 'require-dir';
import express from 'express';
import auth from './middlewares/auth';
import rule from './middlewares/rule';
import config from 'nconf';
import { loginOutputData, getTokenAndVerify } from '../services/accountService';
import SwaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import packageJson from '../package.json';

const swaggerDocument = YAML.load('./swagger/swagger.yaml');
const CONTROLLER_PATH = '../controllers';
const controllers = dir(CONTROLLER_PATH);

const target = config.get('EXECUTE_TARGET');
const {VALID_SWAGGER_APIDOC} = config.get(target);
const NODE_HOST_COMMON_ROUTES = `/v${packageJson.version}`;

module.exports = function (app) {
  //midleware insert here
  app.use(auth);
  app.use(rule);

  Object.keys(controllers).forEach((controller) => {
    let router = express.Router();
    require(`${CONTROLLER_PATH}/${controller}`).path(router);
    app.use(`${NODE_HOST_COMMON_ROUTES}/${controller.replace('Controller', '')}`, router);
  });
  let router = express.Router();
  if(VALID_SWAGGER_APIDOC){
    //set swagger API doc
    let options = {
      customCss: '.swagger-ui section.models.is-open { display: none } div.topbar { display: none }'
    };
    router.use(`${NODE_HOST_COMMON_ROUTES}/apidoc`, SwaggerUi.serve);
    router.get(`${NODE_HOST_COMMON_ROUTES}/apidoc`, SwaggerUi.setup(swaggerDocument, options));
  }
  router.get('*', handleReSession);
  app.use(router);
}

function handleReSession(req, res) {
  getTokenAndVerify(req, res, () => {
    return handleRender(req, res);
  });
}

function handleRender(req, res) {
  let target = config.get('EXECUTE_TARGET');
  res.send(renderFullPage(target, loginOutputData(req)));
}

function renderFullPage(target, preloadedState) {
  let prefix = config.get(target).DEPLOY_PREFIX;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>遠距醫療</title>
      <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossorigin="anonymous">
      <link href="${prefix}/build/styles.css" rel="stylesheet"/>
      <link rel="icon" href="images/favicon.png">
    </head>
    <script>
        window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState).replace(/</g, '\\u003c')}
    </script>

    <body id="body" class="bg-g">
      <div id="content">
      </div>
      <script src="${prefix}/build/vendor.bundle.js"></script>
      <script src="${prefix}/build/main.js"></script>
    </body>
    </html>
    `
}
