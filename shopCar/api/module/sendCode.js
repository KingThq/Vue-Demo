// querystring 内置模块，该模块在urlencoded与对象之间进行转换
const querystring = require("querystring");
const request = require("request");// 请求
const help = require("./help");
// const urlencode = require("urlencode");
const key = "0ad521c035d2f2048";
const tpl_id = "164473"
module.exports.sendCode = function (mobile,cb) {
    let code = help.randomNum(100000,999999);
    let queryObj = {
        mobile,//接收短信的手机号码
        tpl_id,// 短信模板ID，请参考个人中心短信模板设置
        tpl_value:"#code#="+code,
        key
    }
    let url = "http://v.juhe.cn/sms/send?"+querystring.stringify(queryObj);
    // console.log("tpl_value=#code#="+code);
    // console.log(urlencode("tpl_value=#code#="+code));
    request(url,function (err,response,body) {
        if(!err && response.statusCode === 200){
            var results = JSON.parse(body);
            if(results.error_code === 0){
                cb({
                    ok:1,
                    code
                })
            }else{
                cb({
                    ok:-1,
                    msg:results.reason
                })
            }
            console.log(body);
        }else{
            cb({
                ok:-1,
                msg:"网络连接错误"
            })
        }
    })
}
