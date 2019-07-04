const express = require("express");
const db = require("./module/db");
const help = require("./module/help");
const bodyParser = require("body-parser")
const {sendCode} = require("./module/sendCode");
const app = express();
app.use(bodyParser.json())
app.all("*",function (req,res,next) {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","content-type");
    res.header("Access-Control-Allow-Methods","DELETE,PUT");
    next();
})
app.get("/sendCode",function (req,res) {
    // 发送验证码
    /*
    * 1、接收phoneId
    * 2、在发送验证码之前，验证发送的短信是否过期
    * 3、发送验证码
    * 4、将发送的信息（手机号，验证码，发送的时间）*/
    const phoneId = req.query.phoneId;
    function _sendCode() {
        sendCode(phoneId,function (results) {
            if(results.ok === 1){
                db.insertOne("userCodeList",{
                    phoneId,
                    code:results.code,
                    sendTime:Date.now()
                },function (err,results) {
                    if(err) help.json(res);
                    else help.json(res,1,"发送成功")
                })
            }else{
                res.json(results)
            }
        })
    }
    db.findOne("userCodeList",{
        phoneId
    },function (err,results) {
        console.log(results);
        if(results){// results有值
            // 10分钟
            if(results.sendTime+(10*60*1000) < Date.now()){
                // 过期
                _sendCode();
            }else{
                // 未过期
                help.json(res,-1,"请等"+Math.ceil((results.sendTime+(10*60*1000)-Date.now())/1000)+"秒以后再发送");
            }
        }else{
            // 第一次发送验证码
            _sendCode();
        }

    })


});
app.post("/login",function (req,res) {
    /*
    * 1、接收二个参数：phoneId,code
    * 2、去userCodeList集合当中根据phoenId,code查找,看是否有该记录
    *       1、有：
    *           1、检查码是否失效
    *               1、失效：验证码失败
    *               2、未失效：
    *                       1、去用户表中查找是否有该手机号
    *                               1、有，更改最后登陆时间，返回成功
    *                               2、无，在用户表中新增一条记录，返回成功
    *       2、无：验证码或手机号错误*/
    const {phoneId,code} = req.body;
    db.find("userCodeList",{
        whereObj:{
            phoneId,
            code:code/1
        },
        sortObj:{
            sendTime:-1
        }
    },function (err,codeArr) {
        if(codeArr.length > 0){
            const codeInfo = codeArr[0];
            if(codeInfo.sendTime + (20*60*1000) > Date.now()){
                db.findOne("userList",{
                    phoneId
                },function (err,userInfo) {
                    if(userInfo){
                        // 之前登陆过,修改最后登陆的时间
                        db.updateOne("userList",{
                            phoneId
                        },{
                            $set:{
                                lastLoginTime:Date.now()
                            }
                        },function (err,results) {
                            // help.json(res,1,"登陆成功")
                            res.json({
                                ok:1,
                                msg:"登陆成功",
                                phoneId
                            })
                        })
                    }else{
                        // 未登陆过
                        db.insertOne("userList",{
                            phoneId,
                            goldNum:99999999,
                            regTime:Date.now(),
                            lastLoginTime:Date.now()
                        },function (err,results) {
                            res.json({
                                ok:1,
                                msg:"登陆成功",
                                phoneId
                            })
                        })
                    }
                })
            }else{
                help.json(res,-1,"验证码已失效，请重新发送验证码！");
            }
        }else{
            help.json(res,-1,"验证码或手机号错误");
        }
    })
});
// 加入购物车
app.get("/joinCar",function (req,res) {
    /*思路：
    * 1、接收参数：phoneId,goodsId
    * 2、验证库存是否充足：通过goodsId,查找商品信息
    *   1、充足：
    *       1、商品的库存减1
    *       2、查看该用户的购物车当中是否有该商品
    *           1、有，
    *               购买数量 加1
    *           2、无
    *               增加一条购物信息
    *   2、不充足：提示库存不足*/
    let {phoneId,goodsId} = req.query;
    db.findOneById("goodsList",goodsId,function (err,goodsInfo) {
        if(err) help.json(res)
        else if(!goodsInfo) help.json(res,-1,"您要购买的商品不存在呦！")
        else{
            if(goodsInfo.goodsStore > 0){
                // 库存充足
                db.updateOneById("goodsList",goodsId,{
                    $inc:{
                        goodsStore:-1
                    }
                },function (err,results) {
                    db.findOne("carList",{
                        phoneId,
                        goodsId:goodsInfo._id
                    },function (err,carInfo) {
                        if(carInfo){// 该用户购物车内有该商品
                            // 购买数量 加1
                            db.updateOne("carList",{
                                _id:carInfo._id
                            },{
                                $inc:{
                                    buyNum:1
                                }
                            },function () {
                                res.json({
                                    ok:1,
                                    msg:"加入购物车成功"
                                })
                            })
                        }else{
                            db.insertOne("carList",{
                                goodsId:goodsInfo._id,
                                phoneId,
                                goodsName:goodsInfo.goodsName,
                                goodsPrice:goodsInfo.goodsPrice,
                                buyNum:1,
                                isChecked:true
                            },function (err,reuslts) {
                                res.json({
                                    ok:1,
                                    msg:"加入购物车成功"
                                })
                            })
                        }
                    })

                })
            }else{
                // 库存不足
                help.json(res,-1,"库存不足！")
            }
        }
    })


})
app.get("/goodsList",function (req,res) {
    db.find("goodsList",{
        sortObj:{
            addTime:-1
        }
    },function (err,goodsList) {
        res.json({
            ok:1,
            goodsList
        })
    })
})
// 获得用户下的购物列表
app.get("/getCarList",function (req,res) {
    db.find("carList",{
        whereObj:{
            phoneId:req.query.phoneId
        },
        sortObj:{
            buyNum:-1
        }
    },function (err,carList) {
        res.json({
            ok:1,
            carList,
            msg:"获取成功"
        })
    })
})
// 根据购物车ID,修改选中的状态
app.get("/upCarChecked",function (req,res) {
    let carId = req.query.carId;
    let isChecked = req.query.isChecked === "true"?false:true;
    console.log(carId,typeof isChecked);
    db.updateOneById("carList",carId,{
        $set:{
            isChecked
        }
    },function () {
        res.json({
            ok:1,
            msg:"成功"
        })
    })

})
app.get("/upAllcarChecked",function (req,res) {
    let phoneId = req.query.phoneId;
    let isChecked = req.query.isChecked === "true"?false:true;
    db.updateMany("carList",{
        phoneId
    },{
        $set:{
            isChecked
        }
    },function () {
        res.json({
            ok:1,
            msg:"成功"
        })
    })
})
app.listen(80,function () {
    console.log("success");
})