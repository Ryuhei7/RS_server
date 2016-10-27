var http = require( 'http' ); // HTTPモジュール読み込み
var socketio = require( 'socket.io' ); // Socket.IOモジュール読み込み
var fs = require( 'fs' ); // ファイル入出力モジュール読み込み
var pg = require( 'pg' );

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

  //データベースに接続 
  pg.connect(connect_db, function(err, client){
    console.log("connect db");

    // クライアントからサーバーへ メッセージ送信ハンドラ（自分を含む全員宛に送る）

    //Socket.IO Test
    socket.on( 'test', function( data ) {
      // サーバーからクライアントへ メッセージを送り返し
      io.sockets.emit( 'test_back', data );
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

          var insert_share = "insert into events(share_id,shop_id,table_id,title,category_id,explain,h_user_id,end_time,seatinfo) values ("+ share_max +","+source.shopid+","+source.tableid+",'"+source.title+"',"+source.category_id+",'"+source.explain+"',"+source.userid+",'"+source.endtime+"',"+source.seatinfo+");"
          console.log(insert_share);
          client.query(insert_share);
          io.sockets.emit('sharetable_start_back', share_max);
        });
     });


    //ShareTableList の一覧を出力
    socket.on( 'sharetable_list', function() {
      var table_info = "select share_id, title, category_id, explain from events;"

     var shop_info = "select shop_name from shops;"
      client.query(table_info, function(err,info){
       client.query(shop_info, function(err, sinfo){
        console.log(info.rows.length);

        var i = info.rows.length-1|0;
        var m = info.rows.length|0;
        var n = 0; 
        var list = new Object();
        var arraylist = new Array();
        while(i>=m-10){  
          console.log("share_id="+info.rows[i].share_id+"title="+info.rows[i].title+" category="+info.rows[i].category_id+" explain="+info.rows[i].explain);
          list.shareid = info.rows[i].share_id; 
          list.title = info.rows[i].title;
          list.category_id = info.rows[i].category_id|0;
          list.explain = info.rows[i].explain;
          list.shopname = sinfo.rows[0].shop_name;
          arraylist[n] = list;
          i=(i-1)|0;
          n=(n+1)|0;
        }
        console.log(arraylist[9].title);
        io.sockets.emit('sharetable_list_back', arraylist);
      });
    });
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
           infoback.endtime = res_detail.rows[0].endtime; 
           infoback.explain = res_detail.rows[0].explain;
           infoback.seatinfo = res_detail.rows[0].seatinfo;
           infoback.shop_address = res_shop.rows[0].address;
           infoback.shop_name = res_shop.rows[0].shop_name;
           infoback.shop_x = res_shop.rows[0].y;
           infoback.shop_y =res_shop.rows[0].x;
           console.log("success");
           io.sockets.emit('detail_back',infoback);
          });
        });
      });
    });

//ゲストが参加ボタンをおしてからホストへ情報を送るまで
socket.on('decide',function(data){
 var getuser= "select user_id,name,hyoka from users where user_id ="+data.g_userid+";"
var guser = new Object();
client.query(getuser,function(err,result){
 guser.userid = result.row[0].user_id;
 guser.name = result.row[0].name;
 guser.hyoka = result.row[0].hyoka;
 console.log("success");
 io.sockets.emit('decide_back',guser);
});
});

//ホストからキャンセルの0か、許可の1を受け取ってそれをゲストユーザーへ返す
socket.on('answer',function(data){
io.sockets.emit('answer_back',data)
});

//ゲストがお店にQRでチェックインしたときに1を受け取りそれをホスト側へ送る
socket.on('gcheck',function(data){
io.sockets.emit('gcheck_alart',data)
});

//最後の評価
socket.on('sethyoka',function(data){
var gethyoka = "select hyoka_sum, hyoka_times from users where user_id= "+data.recieveuserid+";"

client.query(gethyoka,function(result){
var sum = result.row[0].hyoka_sum + data.hyoka;
var times = result.row[0].hyoka_times + 1;
 
var newhyoka = Math.round(sum/times);
var update = "update users set hyoka_sum = "+sum+", hyoka_times = "+times+", hyoka = "+newhyoka+" where user_id = "+data.recieveuserid+";"

client.query(update);

var hyokainfo = "insert into hyokainfo value ("+data.senduserid+","+reciveuserid+","+data.comment+","+data.nowhyoka+");"

io.sockets.emit("end","success");
});
});








    //Category List
    socket.on( 'categorylist', function() {

      // /csv/CategoryList.csv を見に行く
      // fs.readFileSync(process.argv[2], 'utf8').split('\n').length - 1
      fs.readFile(__dirname + "/csv/CategoryList.csv", 'utf-8', function(err,source){
        //もし見つからなかったらエラーを返す
        if(err){
          io.sockets.emit( 'categorylist_res', "error" );
        }
        //見つかったらcompleteを返す
        //var yenN = source.split('\n');
        var resultString = source.split(",");
        //var listnum = resultString.length-1;

        io.sockets.emit( 'categorylist_res', "complete" );
        io.sockets.emit( 'categorylist_back' , resultString);

        //console.log(listnum);
      });

      //console.log();
    });


  });
});



/*
// クライアントからサーバーへ メッセージ送信ハンドラ（自分以外の全員宛に送る）
    socket.on( 'c2s_broadcast', function( data ) {
// サーバーからクライアントへ メッセージを送り返し
  socket.broadcast.emit( 's2c_message', { value : data.value } );
    });
    */

// http://engineer.recruit-lifestyle.co.jp/techblog/2015-07-29-node4/

