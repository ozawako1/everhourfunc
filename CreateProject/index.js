const HTTP = require('request');
const Promise = require('promise');
const API_TOKEN = process.env['API_TOKEN'];

const SECTNAME_BILL = "Billable";
const SECTNAME_NONE = "NonBillable";

const PROJECT_RATE = 5000;
const ADMIN_ID = 53560;

const BILLABLE_TASKS =  ["[AA]コンセプト設計", "[AB]仕様作成", "[AC]プログラム開発", 
                      "[BA]単体テスト", "[BB]結合テスト", "[BC]総合テスト","[BD]システムテスト", 
                      "[CA]プロジェクト管理", "[CB]マスタ作成", 
                      "[DA]バグ修正(瑕疵期間外)"];
const NON_BILLABLE_TASKS = ["[KA]企画", "[KB]調査", "[LA]バグ修正(瑕疵対応)"];


function is_HTTP_ok(statuscode)
{
  ret = false;

  if ((statuscode == 200) || 
      (statuscode == 201) ||
      (statuscode == 202)){
    ret = true;
  }
  
  return ret;
}


function EH_set_task_billing(taskId, isBillable)
{
    var headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': API_TOKEN
    };

    var form = {
        'unbillable': !isBillable
    };

    var options = {
        'url': 'https://api.everhour.com/tasks/' + taskId + '/billing',
        'method': 'PUT',
        'headers': headers,
        'json': true,
        'body': form
    };

    HTTP(options, function(error, response, body){});/* {
        if (error || is_HTTP_ok(response.statusCode) == false) {
            var e = error ? error : new Error(response.statusCode + ":" + body.message);
            console.log(e);
        } else {
            console.log("[INFO]" + JSON.stringify(body));
        }
    });*/
}


function EH_set_tasks(projectId, sectionId, tasks)
{

    var headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': API_TOKEN
    };
    var promises = [];
    var i = 1;

    tasks.forEach(function(t){
        var form = {
            'name': t,
            'section': sectionId,
            'status': 'open',
            'position': i
        };

        var options = {
            'url': 'https://api.everhour.com/projects/' + projectId + '/tasks',
            'method': 'POST',
            'headers': headers,
            'json': true,
            'body': form
        };

        var p = new Promise(function(resolve, reject){
            HTTP(options, function(error, response, body) {
                if (error || is_HTTP_ok(response.statusCode) == false) {
                    var e = error ? error : new Error(response.statusCode + ":" + body.message);
                    reject(e);        
                } else {
                    if (NON_BILLABLE_TASKS.indexOf(form.name) >= 0) {
                        //無償タスク
                        EH_set_task_billing(body.id, false);
                    }
                    console.log("[INFO]" + JSON.stringify(body));
                    resolve(body.id);
                }
            });
        });
        promises.push(p);
        i = i + 1;
     });

    return Promise.all(promises);
}


function EH_set_sections(projectId)
{
    var promises = [];
    var i = 1;
    var sectionName = [SECTNAME_BILL, SECTNAME_NONE];
    
    var headers = {
        'content-type': "application/json",
        'x-api-key': API_TOKEN
    };

    sectionName.forEach(function(itm){
        
        var form = {
            'name': itm,
            'status': 'open',
            'position': i
        };
        
        var options = {
            'url': 'https://api.everhour.com/projects/' + projectId + '/sections',
            'method': 'POST',
            'headers': headers,
            'json': true,
            'body': form
        };
            
        var p = new Promise(function(resolve, reject){
            HTTP(options, function(error, response, body) {
                if (error || is_HTTP_ok(response.statusCode) == false) {
                    var e = error ? error : new Error(response.statusCode + ":" + body.message);
                    console.log("[ERROR] rejected. " + e.message + "\n" + e.stack);
                    reject(e);        
                } else {
                    var tasks;
                    if (itm == SECTNAME_BILL) {
                        tasks = BILLABLE_TASKS;
                    } else {
                        tasks = NON_BILLABLE_TASKS;
                    }

                    EH_set_tasks(projectId, body.id, tasks)
                        .then(function(){
                            resolve();
                        })
                        .catch(function(error){
                            reject(error)
                        });
                }
            });
        });
        promises.push(p);

        i++;
    });

    return Promise.all(promises);
}

function EH_set_project_billing(projectId)
{
    var frm = {
        type: "flat_rate",
        rate: PROJECT_RATE
    };
    var hdrs = {
      "content-type": "application/json",
      'x-api-key': API_TOKEN
    };
    var options = {
        uri: "https://api.everhour.com/projects/" + projectId + "/billing",
        method: "PUT",
        headers: hdrs,
        json: true,
        body: frm
    };

    return new Promise(function(resolve, reject){
        HTTP(options, function(error, response, body) {
          if (error || is_HTTP_ok(response.statusCode) == false) {
            var e = error ? error : new Error(response.statusCode + ":" + body.message);
            reject(e);
          } else {
            resolve(projectId);
          }
        });
    });
}

function EH_create_project(code, name, users)
{
    var projectName = "[" + code + "] " + name;
    var frm = {
        name: projectName,
        type: "board",
        users: users
    };
    var hdrs = {
      "content-type": "application/json",
      'x-api-key': API_TOKEN
    };
    var options = {
        uri: "https://api.everhour.com/projects",
        method: "POST",
        headers: hdrs,
        json: true,
        body: frm
    };

    return new Promise(function(resolve, reject){
        HTTP(options, function(error, response, body) {
          if (error || is_HTTP_ok(response.statusCode) == false) {
            var e = error ? error : new Error(response.statusCode + ":" + body.message);
            reject(e);
          } else {
            EH_set_project_billing(body.id)
                .then((pid) => resolve(pid))
                .catch((error) => reject(error));
          }
        });
    });
}


module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    var projectCode = "";
    var projectName = "";
    var owner = [];

    if ((req.body && req.body.projectCode && req.body.projectName && req.body.owner)) {
        projectCode = req.body.projectCode;
        projectName = req.body.projectName;
        owner = req.body.owner;
        
        // administrator always on.
        owner.push(ADMIN_ID);

        EH_create_project(projectCode, projectName, owner)
            .then(projectId => EH_set_sections(projectId))
            .then(function(){
                context.res = {
                    status: 200,
                    body: "Project(" + projectCode + ":"+ projectName + ") has created."
                }
                context.done();
            })
            .catch(function(err){
                context.res = {
                    status: 400,
                    body: err.message
                }
                context.done();
            });

    } else {
        context.res = {
            status: 400,
            body: "Bad request. invalid arg."
        }
        context.done();        
    }

};
