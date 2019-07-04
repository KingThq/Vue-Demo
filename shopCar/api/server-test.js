const express = require("express");
const db = require("./module/db");
const help = require("./module/help");
const bodyParser = require("body-parser");
const {sendCode} = require("./module/sendCode-test");
const app = express();
app.use(bodyParser.json());
app.all("*",function (req,res,next) {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","content-type");
    res.header("Access-Control-Allow-Methods","DELETE,PUT");
    next();
});
//发送短信验证码
app.get("/sendCode", (req, res) => {
    const phoneId = req.query.phoneId;
    function _sendCode() {
        sendCode(phoneId, (results) => {
            if(results.ok === 1) {
                db.insertOne("userCodeList", {
                    phoneId,
                    code: results.code,
                    sendTime: Date.now()
                }, (err, results) => {
                    if(err) help.json(res);
                    else help.json(res, 1, "发送成功")
                })
            } else {
                res.json(results);
            }
        })
    }
    db.find("userCodeList", {
        whereObj: {
            phoneId
        },
        sortObj: {
            sendTime: -1
        }
    }, (err, results) => {
        if(err) help.json(res, -1, "数据库连接失败");
        else {
            // console.log(results);
            if(results.length > 0) {
                //数据库中有记录,设置2分钟过期
                if(results[0].sendTime + (2*60*1000) < Date.now()) {
                    //过期了
                    _sendCode();
                } else {
                    //未过期
                    help.json(res, -1, "请等" + Math.ceil((results[0].sendTime+(2*60*1000) - Date.now())/1000) + "秒以后再试");
                }
            } else {
                //第一次发送验证码
                _sendCode();    
            }
        }
    })
});
//登录接口
app.post("/login", (req, res) => {
    const {phoneId, code} = req.body;
    db.find("userCodeList", {
        whereObj: {
            phoneId,
            code: code / 1
        },
        sortObj: {
            sendTime: -1
        }
    }, (err, codeArr) => {
        if(err) help.json(res, -1, "数据库连接错误");
        else {
            // console.log(codeArr);
            if(codeArr.length > 0) {
                let codeInfo = codeArr[0];
                if(codeInfo.sendTime + (50*60*1000) > Date.now()) {
                    //验证码未过期
                    db.findOne("userList", {
                        phoneId
                    }, (err, userInfo) => {
                        if(err) help.json(res, -1, "数据库连接错误");
                        else {
                            if(userInfo) {
                                //数据库中有记录，修改最后登录时间
                                db.updateOne("userList", {
                                    phoneId
                                }, {
                                    $set: {
                                        lastLoginTime: Date.now()
                                    }
                                }, (err, results) => {
                                    if(err) help.json(res, -1, "数据库连接错误");
                                    else res.json({
                                        ok: 1,
                                        msg: "登陆成功",
                                        phoneId
                                    })
                                })
                            } else {
                                //未登陆过
                                db.insertOne("userList", {
                                    phoneId,
                                    goldNum: 99999,
                                    regTime: Date.now(),
                                    lastLoginTime: Date.now()
                                }, err => {
                                    if(err) help.json(res, -1, "增加用户失败!");
                                    else res.json({
                                        ok: 1,
                                        msg: "登陆成功",
                                        phoneId
                                    })
                                })
                            }
                        }
                    }) 
                } else {
                    help.json(res, -1, "验证码已失效，请重新发送验证码！");
                }
            } else {
                help.json(res, -1, "手机号或验证码错误!");
            }
        }
    })
});
//获取商品
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
});
//加入购物车
app.get("/joinCar", (req, res) => {
    const {phoneId, goodsId} = req.query;
    db.findOneById("goodsList", goodsId, (err, goodsInfo) => {
        if(err) help.json(res, -1, "数据库连接错误");
        else if(!goodsInfo) help.json(res, -1, "您购买的商品不存在！");
        else {
            if(goodsInfo.goodsStore) {
                //库存充足
                db.updateOneById("goodsList", goodsId, {
                    $inc: {
                        goodsStore: -1
                    }
                }, err => {
                    if(err) help.json(res, -1, "数据库连接错误");
                    else {
                        db.findOne("carList", {
                            phoneId,
                            goodsId: goodsInfo._id
                        }, (err, carInfo) => {
                            if(err) help.json(res, -1, "数据库连接错误");
                            else {
                                if(carInfo) {
                                    //购物车中有此商品，数量+1
                                    db.updateOne("carList", {
                                        _id: carInfo._id
                                    }, {
                                        $inc: {
                                            buyNum: 1
                                        }
                                    }, err => {
                                        if(err) help.json(res, -1, "数据库连接错误");
                                        else help.json(res, 1, "加入购物车成功!");
                                    })
                                } else {
                                    //购物车中没有则添加一条记录
                                    db.insertOne("carList", {
                                        phoneId,
                                        goodsId: goodsInfo._id,
                                        goodsName: goodsInfo.goodsName,
                                        goodsPrice: goodsInfo.goodsPrice,
                                        buyNum: 1,
                                        isChecked: true
                                    }, err => {
                                        if(err) help.json(res, -1, "数据库连接错误");
                                        else help.json(res, 1, "加入购物车成功!");
                                    })
                                }
                            }
                        })
                    }
                })
            } else {
                //库存不足
                help.json(res, -1, "该商品库存不足!");
            }
        }
    })
});
//获得用户下的购物列表
app.get("/getCarList", (req, res) => {
    db.find("carList", {
        whereObj: {
            phoneId: req.query.phoneId
        },
        sortObj: {
            buyNum: -1
        }
    }, (err, carList) => {
        if(err) help.json(res, -1, "数据库连接错误！");
        else {
            res.json({
                ok: 1,
                carList
            })
        }
    })
});
// 根据购物车ID,修改选中的状态
app.get("/upCarChecked", (req, res) => {
    let carId = req.query.carId;
    let isChecked = req.query.isChecked === "true"?false:true;  
    // console.log(carId, isChecked);
    db.updateOneById("carList", carId, {
        $set: {
            isChecked
        }
    }, err => {
        if(err) help.json(res, -1, "数据库连接错误");
        else help.json(res, 1, "状态修改成功");
    })
});
//全选
app.get("/upAllChecked", (req, res) => {
    let phoneId = req.query.phoneId;
    let isChecked = req.query.isChecked === "true"?false:true;  
    db.updateMany("carList", {
        phoneId
    }, {
        $set: {
            isChecked
        }
    }, err => {
        if(err) help.json(res, -1, "数据库连接错误");
        else help.json(res, 1, "状态修改成功");
    })
});
//购物车购买数量 +1
app.get("/addBuyNum", (req, res) => {
    const {goodsId, carId} = req.query;
    // console.log(mongoose.Types.ObjectId(goodsId));
    db.findOneById("goodsList", goodsId, (err, goodsInfo) => {
        if(err) help.json(res, -1, "数据库连接错误!");
        else {
            if(goodsInfo.goodsStore > 0) {
                //如果该商品还有库存,让库存 -1
                db.updateOneById("goodsList", goodsInfo._id, {
                    $inc: {
                        goodsStore: -1
                    }
                }, err => {
                    if(err) help.json(res, -1, "数据库连接错误!");
                    else {
                        //修改购物车中的数量 +1
                        db.updateOneById("carList", carId, {
                            $inc: {
                                buyNum: 1
                            }
                        }, err => {
                            if(err) help.json(res, -1, "数据库连接错误!");
                            else help.json(res, 1, "修改成功!");
                        })
                    }
                })
            } else {
                //该商品没有库存
                help.json(res, -1, "该商品库存不足!");
            }
        }
    })
});
//购物车购买数量 -1
app.get("/reduceBuyNum", (req, res) => {
    const {carId, goodsId} = req.query;
    function _upGoods() { 
        db.updateOneById("goodsList", goodsId, {
            $inc: {
                goodsStore: 1
            }
        }, err => {
            if(err) help.json(res, -1, "数据库连接错误！");
            else help.json(res, 1, "成功");
        })
    }
    db.findOneById("carList", carId, (err, carGoods) => {
        if(err) help.json(res, -1, "数据库连接错误！");
        else {
            if(carGoods) {//如果有这个商品
                if(carGoods.buyNum > 1) {
                    //购买的商品数量 >1,就让数量 -1
                    db.updateOneById("carList", carId, {
                        $inc: {
                            buyNum: -1
                        }
                    }, err => {
                        if(err) help.json(res, -1, "操作失败");
                        else {
                            //让该商品的库存 +1
                            _upGoods();
                        }
                    })
                } else if(carGoods.buyNum === 1) {
                    //购买数量为1，就将这个商品从购物车中删除,库存 +1
                    db.deleteOneById("carList", carId, err => {
                        if(err) help.json(res, -1, "数据库连接失败!");
                        else {
                            _upGoods();
                        }
                    })
                } else {
                    help.json(res, -1, "错误!");
                }
            } else {
                help.json(res, -1, "商品不存在！")
            }
        }
    })
});
app.listen(80,function () {
    console.log("success");
})