const querystring = require("querystring");
const request = require("request");
const help = require("./help");
module.exports.sendCode = function(mobile, cb) {
    let code = help.randomNum(100000, 999999);
    let queryObj = {
        mobile,
        tpl_id: "164581",
        tpl_value: "#code#=" + code,
        key: "aab1f52d5efcd7a436de675d11e79ac1"
    };
    let url = "http://v.juhe.cn/sms/send?" + querystring.stringify(queryObj);
    request(url, (err, response, body) => {
        if(err) 
            cb({
                ok: -1,
                msg: "请求错误"
            });
        else {
            if(response.statusCode === 200) {
                let results = JSON.parse(body);
                if(results.error_code === 0) {
                    cb({
                        ok: 1,
                        code
                    })
                } else {
                    cb({
                        ok: -1,
                        msg: results.reason
                    })
                }
            } else {
                cb({
                    ok: -1,
                    msg: "网络连接错误"
                })
            }
        }
    })
}