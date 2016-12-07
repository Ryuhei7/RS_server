var http = require( 'http' ); // HTTPモジュール読み込み
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
  console.log("connect server");

  // クライアントからサーバーへ メッセージ送信ハンドラ（自分を含む全員宛に送る）
  //Socket.IO Test
  socket.on( 'test', function( data ) {
    id = socket.id;
    pg.connect(connect_db, function(err, client){
      // サーバーからクライアントへ メッセージを送り返し
      io.sockets.to(id).emit( 'test_back', data );
      //console.log(datta.value);
      console.log(data);
    });
  });


  //QRCode Maker
  socket.on( 'qrcodemaker', function( source ) {
    pg.connect(connect_db, function(err, client){
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
  });


  //ShareTable List
  //ShareTableList に新しくテーブルを追加
  socket.on( 'sharetable_start', function( source ) {
    pg.connect(connect_db, function(err, client){
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
  });


  //ShareTableList の一覧を出力
  socket.on( 'sharetable_list', function(data) {
    var y = data.location_y;
    var x = data.location_x;

    console.log(x);
    console.log(y);
    pg.connect(connect_db, function(err, client){
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
      }else{}
    });
  });


  //クライアントでリストのどれかを選ばれたときに詳細を渡す
  socket.on('detail',function (id){
    pg.connect(connect_db, function(err, client){
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
  });

  //ゲストが参加ボタンをおしてからホストへ情報を送るまで
  socket.on('decide',function(data){
    pg.connect(connect_db, function(err, client){
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
  });

  //ホストからキャンセルの0か、許可の1を受け取ってそれをゲストユーザーへ返す
  socket.on('answer',function(data){
    id = socket.id;
    pg.connect(connect_db, function(err, client){
      console.log("success");
      io.sockets.emit('answer_back',data)
    });
  });

  //ゲストがお店にQRでチェックインしたときに1を受け取りそれをホスト側へ送る
  socket.on('gcheck',function(data){
    id = socket.id;
    pg.connect(connect_db, function(err, client){
      console.log("success");
      io.sockets.emit('gcheck_back',data)
    });
  });

  socket.on('hyokauser',function(data){
    pg.connect(connect_db, function(err, client){
      console.log(data);
      var uid = "select h_user_id, g_user_id from events where share_id = "+data+";"
      client.query(uid,function(data2){
        var arr = new Array();
        arr[0]=data2.rows[0].h_user_id;
        arr[1]=data2.rows[0].g_user_id;
        socket.to(socket.id).emit(hyokauser_back, arr);
      });
    });
  });



  //最後の評価
  socket.on('sethyoka',function(data){
    pg.connect(connect_db, function(err, client){
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
  });

  socket.on('menu_request',function(data){
    pg.connect(connect_db,function(err,client){
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
  });

  socket.on('newuser',function(data){
    pg.connect(connect_db,function(err,client){
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
  });

  socket.on('load',function(data){
    pg.connect(connect_db,function(err,client){
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
  });

  socket.on('chat_send',function(data){
    socket.broadcast.emit('chat_reception',data);
  });


});
