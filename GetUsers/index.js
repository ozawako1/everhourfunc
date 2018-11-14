const HTTP = require('request');
const API_TOKEN = process.env['API_TOKEN'];

const TYPE_USER = "user";
const TYPE_GROUP = "group";

function format_groups(arr)
{
    //所属しているユーザー情報を切り捨てる
    var groups = [];

    arr.forEach(function(itm){
        var g = {
            'id': itm.id,
            'name': itm.name
        }
        groups.push(g);

    });

    return groups;
}

function format_users(arr)
{
    var users = [];

    arr.forEach(function(itm){
        if (itm.status == 'active') {
            var gid = "";
            if (itm.groups.length > 0) {
                gid = itm.groups[0].id;
            }

            var u = {
                'id': itm.id,
                'email': itm.email,
                'name': itm.name,
                'headline': itm.headline,
                'group_id': gid,
                'role': itm.role,
                'status': itm.status
            }

            users.push(u);
        }
    });

    return users;
}

function EH_get_groups(callback)
{
    var ret = 0;

    var headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': API_TOKEN
    };

    var options = {
        'url': 'https://api.everhour.com/team/groups',
        'method': 'GET',
        'headers': headers,
        'json': true,
    };

    HTTP(options, function(error, response, body) {
        if (error) {
          callback(error, null);
        } else {
          var users = format_groups(body);
          callback(null, users);
        }
    });
    
    return ret;
}

function EH_get_users(callback)
{
  var ret = 0;
  
  var headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': API_TOKEN
  };

  var options = {
    'url': 'https://api.everhour.com/team/users',
    'method': 'GET',
    'headers': headers,
    'json': true,
  };

  HTTP(options, function(error, response, body) {
    if (error) {
      callback(error, null);
    } else {
      var users = format_users(body);
      callback(null, users);
    }
  });

  return ret;
};

module.exports = function (context, req) {
    
    context.log('JavaScript HTTP trigger function processed a request.');

    var type = TYPE_USER;


    if (req.query != null && req.query.type == "group") {
        type = TYPE_GROUP;
    }

    if (type == TYPE_USER){
        EH_get_users(function(error, users){
            if(error) {
                context.log(error);
                context.res = {
                    status: 500,
                    body: error.message
                }
                context.done();
            } else {
                context.res = {
                    status: 200,
                    body: users
                }
                context.done();
            }
        });
    } else {
        EH_get_groups(function(error, users){
            if(error) {
                context.log(error);
                context.res = {
                    status: 500,
                    body: error.message
                }
                context.done();
            } else {
                context.res = {
                    status: 200,
                    body: users
                }
                context.done();
            }
        });
    }
    

};
