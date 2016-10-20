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
    var insert_share = "insert into events(share_id,shop_id,table_id,title,category_id,explain,h_user_id,end_time) values (0,0,0,'test',0,'test',0,'0:00');"
    client.query(insert_share);
    console.log(insert_share);//SQL文をコンソールに表示
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
    
data = source.title + "," + source.category + "," + source.endtime + "," + source.explain + "," + source.shopid + "," + source.tableid + "," + source.userid + '\n';
   
    var insert_share = "insert into events(share_id,shop_id,table_id,title,category_id,explain,h_user_id,end_time) values (0,0,0,'test',0,'test',0,'0:00');"
    console.log(insert_share);
    io.sockets.emit('sharetable_start_back', "complete");
});

/*
    // /csv/ShopList.csv に保存
    fs.appendFile(__dirname + "/csv/ShareTableList.csv", data , 'utf-8', function(err){
      //もし見つからなかったらエラーを返す
      if(err){
        io.sockets.emit( 'sharetable_start_res', "error" );
      }
      //見つかったらcompleteを返す
      io.sockets.emit( 'sharetable_start_res', "complete" );
    });
    console.log(data);
  });
*/


  //ShareTableList の一覧を出力
  socket.on( 'sharetable_list', function() {
    // /csv/ShareTableList.csv を読みに行く
    fs.readFile(__dirname + "/csv/ShareTableList.csv", 'utf-8', function(err,source){
    //もし見つからなかったらエラーを返す
      if(err){
        io.sockets.emit( 'sharetable_list_res', "error" );
      }
      var yenN = source.split('\n');
      var data = new Array();   //dataを配列として宣言
      for(var i=0;i<yenN.length-1;i++){
        var tmp = yenN[i].split(",");
        data[i] = new Object();
        data[i].title = tmp[0];
        data[i].category = tmp[1];
        data[i].endtime = tmp[2];
        data[i].explain = tmp[3];
        data[i].shopid = tmp[4];
        data[i].tableid = tmp[5];
        data[i].userid = tmp[6];
      }

    //見つかったらcompleteを返す
      io.sockets.emit( 'sharetable_list_res', "complete" );
      io.sockets.emit( 'sharetable_list_back', data );
    });
  });

  //ShareTableList にテーブルのシェアを終了したことを記録
  socket.on( 'sharetable_end', function( data ) {
    data = data + '\n';

    // /csv/ShopList.csv に保存
    fs.appendFile(__dirname + "/csv/ShareTableList.csv", data , 'utf-8', function(err){
      //もし見つからなかったらエラーを返す
      if(err){
        io.sockets.emit( 'sharetable_end_res', "error" );
      }
      //見つかったらcompleteを返す
      io.sockets.emit( 'sharetable_end_res', "complete" );
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

