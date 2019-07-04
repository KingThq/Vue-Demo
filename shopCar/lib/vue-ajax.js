// 为Vue构造函数的原型对象增加了一个名字叫 $http的对象，对象中有一个方法叫GET, 该方法返回一个Promise
Vue.prototype.$http ={
    get(url){
        return new Promise((resolve,reject)=>{
            var xhr = new XMLHttpRequest();
        xhr.open("get",url);
        xhr.send();
        xhr.onload =()=>{
            if(xhr.status === 200)
                resolve(JSON.parse(xhr.responseText));
            else
                reject("连接错误")
        }
    })
    }
};