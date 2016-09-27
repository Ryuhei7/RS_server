# RecoReco

## HTML5班での動作テスト  
・inde.htmlとsocket.io.jsが必要  
・以下の変更が必要  
　Befor：<script type="text/javascript" src="/socket.io/socket.io.js"></script>  
　After：<script type="text/javascript" src="socket.io.jsファイルが有るディレクトリ"></script>  

## JS命名規則
・以下のURLを参考にした  
http://analogic.jp/naming-convention/  
・socketのイベント名は考え中  

## 本プログラムで必要となるライブラリ  
・socket.io  
・pg(node-postgres)

## 構成ファイル
・Procfile　heroku　サーバでのプログラム実行に必要  
・index.html　テスト用チャット画面  
・package.json　jsの構成などを記述、herokunにも必要  
・server.js　メイン鯖  

## プログラムの動作テスト用URL  
https://recodemo.herokuapp.com/  

## Socket.ioの実装・学習において~~コピペ~~参考にしたサイト  
http://www.atmarkit.co.jp/ait/articles/1603/14/news015.html  

## Socket.ioの主な通信部分  
https://heavy-metal-explorer.com/approach_socket_io/  

## JSで用いるJSONなどの値  
http://dev.classmethod.jp/etc/concrete-example-of-json/  

## 現在の問題点  
・SQLインジェクション対策  
・文章中の文字検索アルゴリズム  
