﻿var http = require( 'http' ); // HTTPモジュール読み込み
var socketio = require( 'socket.io' ); // Socket.IOモジュール読み込み
var fs = require( 'fs' ); // ファイル入出力モジュール読み込み
var pg = require( 'pg' );
var id;

//サーバー実装の前にエラーハンドリングを記述
process.on('uncaughtException', function(err) {
  console.log(err);
});

/*
//ちゃんとエラー処理を書くとこうなる
try {
  var json = JSON.parse('<tag>NOT JSON FORMART</tag>');
} catch (e) {
  res.writeHead(400, {"Content-Type":"text/html"});
  res.end('invalid format');
  return;
}
*/

// ポート固定でHTTPサーバーを立てる
var server = http.createServer( function( req, res ) {
  //もしURLにファイル名がないならばindex.htmlに飛ばすように
  if(req.url == "/")
    req.url = "/index.html";
  //URLでリクエストされたページをread
  fs.readFile(__dirname + req.url, 'utf-8', function(err, data){
    //もし見つからなかったら404を返す
    if(err){　//err=trueならNot Foundを返します。
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write("Not Found");
      return res.end();　
    }
    //見つかったら表示
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    res.end();
  });
});
server.listen(process.env.PORT)



// サーバーをソケットに紐付ける
var io = socketio.listen( server );

//データベースの設定
var connect_db = "postgres://yugnpicjkinvfl:OurBFpqG6zgJnxuuTflaqo5FHN@ec2-54-163-248-218.compute-1.amazonaws.com:5432/d2pggvvc541c3";


// 接続確立後の通信処理部分を定義
io.sockets.on( 'connection', function( socket ) {
  console.log("Connect Server");

  //DBへの接続
  pg.connect(connect_db,function(err,client){
    console.log("Connect DB");

    // クライアントからサーバーへ メッセージ送信ハンドラ（自分を含む全員宛に送る）
    //Socket.IO Test
    socket.on( 'test', function( data ) {
      id = socket.id;

      // サーバーからクライアントへ メッセージを送り返し
      io.sockets.to(id).emit( 'test_back', data );
      //console.log(datta.value);
      console.log(data);

    });


    //QRCode Maker
    socket.on( 'qrcodemaker', function( source ) {

      data = source.shopid + "," + source.tableid + '\n';
      // /csv/ShopList.csv に保存
      fs.appendFile(__dirname + "/csv/ShopList.csv", data , 'utf-8', function(err){
        //もし見つからなかったらエラーを返す
        if(err){
          io.sockets.emit( 'qrcodemaker_res', "error" );
        }
        //見つかったらcompleteを返す
        io.sockets.emit( 'qrcodemaker_res', "complete" );
      });
      console.log(data);

    });


    //ShareTable List
    //ShareTableList に新しくテーブルを追加
    socket.on( 'sharetable_start', function( source ) {


      console.log("recieved sharetable_start");

      var get_max = "select share_id from events;"

      client.query(get_max, function(err,max)
        {
          console.log(get_max);
          console.log(max);
          var  share_max = max.rows.length+1;
          console.log(share_max);
          var socketid = socket.id;
          var insert_share = "insert into events(share_id,shop_id,table_id,title,category_id,explain,h_user_id,end_time,seatinfo,socket_host) values ("+ share_max +","+source.shopid+","+source.tableid+",'"+source.title+"',"+source.category_id+",'"+source.explain+"',"+source.userid+",'"+source.endtime+"',"+source.seatinfo+",'"+socketid+"');"
          console.log(insert_share);
          client.query(insert_share);
          id  = socket.id;
          io.sockets.to(id).emit('sharetable_start_back', share_max);
        });

    });


    //ShareTableList の一覧を出力
    socket.on( 'sharetable_list', function(data) {
      var y = data.location_y;
      var x = data.location_x;

      console.log(x);
      console.log(y);

      if(err){
        console.log(err);
      } else {
        //エラー処理
        client.on('error', function(error) {
          console.log("error event stat...");
        });

        if(data.refine==0){
          var table_info = "select share_id, title, category_id, explain from events;"
          var shop_info = "select shop_name from shops;"
          client.query(table_info, function(err,info){
            client.query(shop_info, function(err, sinfo){
              console.log(info.rows.length);

              var i = info.rows.length-1;
              var m = info.rows.length;
              var n = 0;
              var arraylist = new Array();
              while(i>=m-10){
                console.log("share_id="+info.rows[i].share_id+"title="+info.rows[i].title+" category="+info.rows[i].category_id+" explain="+info.rows[i].explain);
                arraylist[n] = new Object();
                arraylist[n].shareid = info.rows[i].share_id;
                arraylist[n].title = info.rows[i].title;
                arraylist[n].category_id = info.rows[i].category_id|0;
                arraylist[n].explain = info.rows[i].explain;
                arraylist[n].shopname = sinfo.rows[0].shop_name;
                //arraylist[n] = list;
                i=(i-1)|0;
                //console.log(arraylist[n].title);
                n= n + 1;
              }
              id = socket.id;
              io.sockets.to(id).emit('sharetable_list_back', arraylist);
            });
          });
        }else if(data.refine==1){
          var table_info = "select share_id, title, category_id, explain from events where category_id = "+data.category_id+";"
          var shop_info = "select shop_name from shops;"
          client.query(table_info, function(err,info){
            if(info.rows.length>0){
              client.query(shop_info, function(err, sinfo){
                console.log(info.rows.length);

                var i = info.rows.length-1;
                var m = info.rows.length;
                var n = 0;
                var arraylist = new Array();
                while(n<m){
                  console.log("share_id="+info.rows[i].share_id+"title="+info.rows[i].title+" category="+info.rows[i].category_id+" explain="+info.rows[i].explain);
                  arraylist[n] = new Object();
                  arraylist[n].shareid = info.rows[i].share_id;
                  arraylist[n].title = info.rows[i].title;
                  arraylist[n].category_id = info.rows[i].category_id|0;
                  arraylist[n].explain = info.rows[i].explain;
                  arraylist[n].shopname = sinfo.rows[0].shop_name;
                  //arraylist[n] = list;
                  i=(i-1)|0;
                  //console.log(arraylist[n].title);
                  n= n + 1;
                }
                id = socket.id;
                io.sockets.to(id).emit('sharetable_list_back', arraylist);
              });
            }else{}
          });
        }else if(data.refine==2){
          var shop_info = "select shop_name, shop_id from shops where shop_name = '"+data.shopname+"';"
          client.query(shop_info, function(err, sinfo){
            if (sinfo.rows.length>0){
              var table_info = "select share_id, title, category_id, explain from events where shop_id = "+sinfo.rows[0].shop_id+";"
              client.query(table_info, function(err,info){

                console.log(info.rows.length);

                var i = info.rows.length-1;
                var m = info.rows.length;
                var n = 0;
                var arraylist = new Array();
                while(n<m){
                  console.log("share_id="+info.rows[i].share_id+"title="+info.rows[i].title+" category="+info.rows[i].category_id+" explain="+info.rows[i].explain);
                  arraylist[n] = new Object();
                  arraylist[n].shareid = info.rows[i].share_id;
                  arraylist[n].title = info.rows[i].title;
                  arraylist[n].category_id = info.rows[i].category_id|0;
                  arraylist[n].explain = info.rows[i].explain;
                  arraylist[n].shopname = sinfo.rows[0].shop_name;
                  //arraylist[n] = list;
                  i=(i-1)|0;
                  //console.log(arraylist[n].title);
                  n= n + 1;
                }
                id = socket.id;
                io.sockets.to(id).emit('sharetable_list_back', arraylist);
              });
            }else{}
          });
        }else if(data.refine==3){
          console.log("radius serch");
          var e = 0.081819191042815790;
          var e2= 0.00669438002301188;
          console.log(e2);
          var ae = 6335439.32708317;
          var a = 6378137.000;
          var x1 = data.location_x * Math.PI / 180;
          var y1 = data.location_y * Math.PI / 180;
          var dis = data.radius;
          var get_shop = "select * from shops;"
          var arr_cou = 0;
          var arr = new Array();
          client.query(get_shop,function(err, shop){
            var smax = shop.rows.length;
            var i;
            for(i=0;i<smax;i=i+1){
              var x2 = shop.rows[i].shop_y * Math.PI / 180;
              console.log(x2);
              var y2 = shop.rows[i].shop_x * Math.PI / 180;
              console.log(y2);
              var uy = (y1 + y2)/2;
              var dx = x1 - x2;
              var dy = y1 - y2;
              var sin_uy2 = Math.pow(Math.sin(uy),2);
              console.log(sin_uy2);
              var w = Math.sqrt(1-(e2 * sin_uy2));
              console.log(w);
              var m = ae/Math.pow(w,3);
              console.log(m);
              var n = a/w;
              console.log(n);
              var d = Math.sqrt(Math.pow((dy*m),2) + Math.pow((dx*n*Math.cos(uy),2)));
              console.log(d);
              if(d<=dis*100.0){
                arr[arr_cou] = shop.rows[i].shop_id;
                arr_cou = arr_cou + 1;
              }else{
              }
            }
            if(arr.length>0){
              var i;
              var table_info = "select share_id, title, category_id, explain from events where"
              for(i=0;i<arr.length;i++){
                if(i==arr.length-1){
                  table_info += " shop_id = "+arr[i]+";";
                }else{
                  table_info += " shop_id = "+arr[i]+"";
                  table_info += " and";
                }
              }
              client.query(table_info, function(err,info){
                console.log(info.rows.length);
                var i = info.rows.length-1;
                var m = info.rows.length;
                var n = 0;
                var arraylist = new Array();
                while(n<m){
                  console.log("share_id="+info.rows[i].share_id+"title="+info.rows[i].title+" category="+info.rows[i].category_id+" explain="+info.rows[i].explain);
                  arraylist[n] = new Object();
                  arraylist[n].shareid = info.rows[i].share_id;
                  arraylist[n].title = info.rows[i].title;
                  arraylist[n].category_id = info.rows[i].category_id|0;
                  arraylist[n].explain = info.rows[i].explain;
                  var g;
                  for(g=0;g<smax;g++){
                    if(info.rows[i].shop_id==shop.rows[g].shop_id){
                      arraylist[n].shopname = shop.rows[g].shop_name;
                    }else{
                    }
                  }
                  //arraylist[n] = list;
                  i=(i-1)|0;
                  //console.log(arraylist[n].title);
                  n= n + 1;
                }
                id = socket.id;
                io.sockets.to(id).emit('sharetable_list_back', arraylist);
              });
            }else{}
          });
        }else{}
      }

    });

    //クライアントでリストのどれかを選ばれたときに詳細を渡す
    socket.on('detail',function (id){

      console.log("受信");
      var infoback = new Object();
      var get_detail = "select * from events where share_id = "+id+";"
      client.query(get_detail, function(err,res_detail){
        var get_h_user = "select user_id,name,hyoka from users where user_id = "+res_detail.rows[0].h_user_id+";"
        client.query(get_h_user, function(err,res_h_user){
          var get_shop = "select * from shops where shop_id = "+res_detail.rows[0].shop_id+";"
          client.query(get_shop, function(err,res_shop){

            infoback.hname = res_h_user.rows[0].name;
            infoback.huserid = res_h_user.rows[0].user_id;
            infoback.hyoka =  res_h_user.rows[0].hyoka;
            infoback.title = res_detail.rows[0].title;
            infoback.category = res_detail.rows[0].category_id;
            infoback.endtime = res_detail.rows[0].end_time;
            infoback.explain = res_detail.rows[0].explain;
            infoback.seatinfo = res_detail.rows[0].seatinfo;
            infoback.seatnum = res_detail.rows[0].table_id;
            infoback.shop_address = res_shop.rows[0].address;
            infoback.shop_name = res_shop.rows[0].shop_name;
            infoback.shop_x = res_shop.rows[0].y;
            infoback.shop_y =res_shop.rows[0].x;
            console.log("success");
            console.log(infoback.endtime);
            console.log(infoback.seatnum);
            id = socket.id;
            io.sockets.to(id).emit('detail_back',infoback);
          });
        });
      });

    });

    //ゲストが参加ボタンをおしてからホストへ情報を送るまで
    socket.on('decide',function(data){

      var getuser= "select user_id,name,hyoka from users where user_id =2;"
      client.query(getuser,function(err,result){
        console.log(data[0]);
        var sockethost = "select socket_host from events where shere_id = "+data[0]+";"
        client.query(sockethost,function(err,host){
          var guser= new Object();
          guser.userid = result.rows[0].user_id;
          guser.name = result.rows[0].name;
          guser.hyoka = result.rows[0].hyoka;
          console.log("success");
          console.log(guser.name);
          io.sockets.emit('decide_back',guser);
          var inguest = "update events set g_user_id = "+result.rows[0].user_id+" where shere_id = "+data[0]+";"
        });
      });

    });

    //ホストからキャンセルの0か、許可の1を受け取ってそれをゲストユーザーへ返す
    socket.on('answer',function(data){
      id = socket.id;

      console.log("success");
      io.sockets.emit('answer_back',data)

    });

    //ゲストがお店にQRでチェックインしたときに1を受け取りそれをホスト側へ送る
    socket.on('gcheck',function(data){
      id = socket.id;

      console.log("success");
      io.sockets.emit('gcheck_back',data)

    });

    socket.on('hyokauser',function(data){

      console.log(data);
      var uid = "select h_user_id, g_user_id from events where share_id = "+data+";"
      client.query(uid,function(data2){
        var arr = new Array();
        arr[0]=data2.rows[0].h_user_id;
        arr[1]=data2.rows[0].g_user_id;
        socket.to(socket.id).emit(hyokauser_back, arr);
      });

    });



    //最後の評価
    socket.on('sethyoka',function(data){

      var gethyoka = "select hyoka_sum, hyoka_times from users where user_id= "+data.recieveuserid+";"
      console.log(data.nowhyoka);
      console.log(data.recieveuserid);
      client.query(gethyoka,function(err, result){
        console.log(result.rows[0].hyoka_sum);
        var i = parseInt(data.nowhyoka);
        var sum = parseInt(result.rows[0].hyoka_sum) + parseInt(data.nowhyoka);
        var times = parseInt(result.rows[0].hyoka_times) + 1;
        var newhyoka = Math.round(sum/times);
        var update = "update users set hyoka_sum = "+sum+", hyoka_times = "+times+", hyoka = "+newhyoka+" where user_id = "+data.recieveuserid+";"

        client.query(update);
        var hyokainfo = "insert into hyokainfo values ("+data.senduserid+","+data.recieveuserid+",'"+data.comment+"',"+data.nowhyoka+");"
        client.query(hyokainfo);
        //io.sockets.to(id).emit("end","success");
        console.log("success");
      });

    });

    socket.on('menu_request',function(data){

      var menu = "select * from items where shop_id = 1;"
      client.query(menu,function(err, data){
        var array = new Array();
        var max = data.rows.length-1;
        var i = 0;
        while(i<max){
          array[i] = new Object();
          array[i].menu = data.rows[i].name;
          array[i].url = data.rows[i].url;
          array[i].price = data.rows[i].price;
          i=i+1|0;
        }
        socket.emit('menu_list',array);
      });

    });

    socket.on('newuser',function(data){

      var gmax = "select user_id from users;"
      client.query(gmax,function(err, data2){
        var max = parseInt(data2.rows.length)+1;
        console.log(max);
        var add = "insert into users(user_id, hyoka, name, point, password, hyoka_sum, hyoka_times) values ("+max+",0,'"+data.username+"',100,'"+data.password+"',0,0);"
        client.query(add);
        var nu = socket.id;
        io.sockets.to(nu).emit("newuser_back",max);
      });

    });

    socket.on('load',function(data){

      console.log(data);
      var check = "select scheck,share_id from events where scheck = 0 and (h_user_id = "+data+" or g_user_id = "+data+");"
      client.query(check,function(err, data2){
        console.log(data2);
        console.log(data2.rows.length);
        if(data2.rows.length!=0){
          var sc1 = new Object();
          sc1.shrecheck = data2.rows[0].scheck;
          sc1.shareid = data2.rows[0].scheck;
          var load1 = socket.id;
          io.sockets.to(load1).emit("load_back",sc1);
        }else{
          var sc2 = new Object();
          sc2.sharecheck = 0;
          sc2.shareid = 0;
          var load2 = socket.id
          io.sockets.to(load2).emit("load_back",sc2);
        }
      });

    });

    //チャット
    socket.on('chat_send',function(data){
      socket.broadcast.emit('chat_reception',data);
    });

    //通信切断時にDBからも切断
    socket.on('disconnect',function(){
      pg.end();
      console.log("Disconnect");
    });

  });
});

