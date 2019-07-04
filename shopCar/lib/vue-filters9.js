// 定义全局过滤器,第一个参数是过滤器的名字，第二个参数是一个回调函数(第一个参数是你要过滤的数据)
// Vue.filter("date",(v)=>{
//     var time = new Date(v);
//     var timeStr = time.getFullYear()+"-"+
//         (time.getMonth()+1).toString().padStart(2,"0")+"-"+
//         time.getDate().toString().padStart(2,"0")+ " "+
//         time.getHours().toString().padStart(2,"0")+":"+
//         time.getMinutes().toString().padStart(2,"0")+":"+
//         time.getSeconds().toString().padStart(2,"0");
//     return timeStr;
// })
// Vue.filter("currency",(v,n=2)=>{
//     return "￥"+v.toFixed(n);
// })

export default {
    // 函数名是过滤器名
    date(v){
        var time = new Date(v);
        var timeStr = time.getFullYear()+"-"+
            (time.getMonth()+1).toString().padStart(2,"0")+"-"+
            time.getDate().toString().padStart(2,"0")+ " "+
            time.getHours().toString().padStart(2,"0")+":"+
            time.getMinutes().toString().padStart(2,"0")+":"+
            time.getSeconds().toString().padStart(2,"0");
        return timeStr;
    },
    currency(v,n=2){
        return "￥"+v.toFixed(n);
    }


}
