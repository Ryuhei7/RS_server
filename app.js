var http = require( 'http' ); // HTTPモジュール読み込み
var socketio = require( 'socket.io' ); // Socket.IOモジュール読み込み
var fs = require( 'fs' ); // ファイル入出力モジュール読み込み

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
/*
    res.writeHead(200, { 'Content-Type' : 'text/html' }); // ヘッダ出力
    res.end( fs.readFileSync(__dirname + '/index.html', 'utf-8') );  // index.htmlの内容を出力
    }).listen(process.env.PORT);
    */

// サーバーをソケットに紐付ける
var io = socketio.listen( server );

// 接続確立後の通信処理部分を定義
io.sockets.on( 'connection', function( socket ) {

  // クライアントからサーバーへ メッセージ送信ハンドラ（自分を含む全員宛に送る）
  //Socket.IO Test
  socket.on( 'test', function( data ) {
    // サーバーからクライアントへ メッセージを送り返し
    io.sockets.emit( 'test_back', data );
    //console.log(datta.value);
    console.log(data);
  });

  //QRCode Maker
  socket.on( 'qrcodemaker', function( data ) {
    data = data + '\n';

    // /csv/ShopList.csv に保存
    fs.appendFile(__dirname + "/csv/ShopList.csv", data , 'utf-8', function(err){
      //もし見つからなかったらエラーを返す
      if(err){
        io.sockets.emit( 'qrcodemaker_back', "error" );
      }
      //見つかったらcompleteを返す
      io.sockets.emit( 'qrcodemaker_back', "complete" );
    });

    console.log(data);
  });

  //ShareTableList
  socket.on( '', function( data ) {
    data = data + '\n';

    // /csv/ShopList.csv に保存
    fs.appendFile(__dirname + "/csv/ShopList.csv", data , 'utf-8', function(err){
      //もし見つからなかったらエラーを返す
      if(err){
        io.sockets.emit( 'qrcodemaker_back', "error" );
      }
      //見つかったらcompleteを返す
      io.sockets.emit( 'qrcodemaker_back', "complete" );
    });

    console.log(data);
  });

  /*
  // クライアントからサーバーへ メッセージ送信ハンドラ（自分以外の全員宛に送る）
    socket.on( 'c2s_broadcast', function( data ) {
  // サーバーからクライアントへ メッセージを送り返し
        socket.broadcast.emit( 's2c_message', { value : data.value } );
    });
    */


});


// http://engineer.recruit-lifestyle.co.jp/techblog/2015-07-29-node4/

