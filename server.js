/* モジュールの読み込み */
var http = require('http'); 
var socketio = require('socket.io');
var fs = require('fs');

/* サーバのスタート */
var server = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync(__dirname + '/index.html', 'utf-8'));
}).listen(process.env.PORT || 2010);  // ポート競合の場合は値を変更

var io = socketio.listen(server);

var pg = require('pg');
var connet_db = "postgres://zygavxblehfkjs:uqdCMcf-d0r1ZFhVFcWCalYfzO@ec2-54-243-199-79.compute-1.amazonaws.com:5432/d1ak8uihr9702r?ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory";

/* コネクションの確立 */
io.sockets.on('connection', function(socket)
{
    var room = '';　//ユーザが入室した部屋の記録
    var userName = '';　//ユーザ名
    console.log("connect server");

    /* データベースに接続 */
    pg.connect(connet_db, function(err, client)
    {
        console.log("connect db");

        /* サーバに参加した時 */
        socket.on('server_join', function(data)
        {
            room = data.select_room_value;
            socket.join(room);
        });

        /* チャット受信時時 */
    	socket.on('emit_chat', function(data)
        {
            var fontColor = "#000000"//getWordColor(data.messave_value);
            emitMessage(userName, data.font_size_value, fontColor, data.message_value);
        });

        /* ルームに参加時、部屋にいる他のユーザに知らせる */
        socket.on('login_announce_for_others', function(data)
        {
            socket.broadcast.to(room).emit('system_announce', {system_log_value : data.entry_message_value});
        });

        /* ルームに参加時、参加したユーザのみに知らせる */
        socket.on('login_announce_on_myself', function(data)
        {
            var id = socket.id;
            userName = data.user_name_value;
            var personalMessage = "あなたは　" + userName + "　さんとして入室しました。";
            emitSystemAnnounceId(id, personalMessage);
            getChatLogs(id);
        });

        /* 切断時のアナウンス */
        socket.on('disconnect', function()
        {
            if (userName == '')
            {
                console.log("未入室のまま、どこかへ去っていきました。");
            } 
            else 
            {
                var endMessage = userName + "　さんが退出しました。"
                emitSystemAnnounceRoom(room, endMessage);
            }
        });


        /*
         * 機能関係のメソッド実装
         */

        /*チャット送信*/
        function emitMessage(userName, fontSize, fontColor, message)
        {
            io.to(room).emit('append_chat', 
            {
                user_name_value  : userName,
                font_size_value  : fontSize,
                font_color_value : fontColor,
                message_value    : message
            });
            //messageLogSave(userName, fontSize, fontColor, message);
            //console.log(message + fontSize + fontColor + userName);
        }

        /* 送信したチャットのログを保存する */
        function messageLogSave(userName, fontSize, fontColor, message)
        {
            client.query("INSERT INTO chat_logs(message, font_size, font_color, user_name) VALUES('" 
                + message + "','" + fontSize + "','" + fontColor + "','" + userName +"')");
        }

        /* 個人にシステムアナウンスをする */
        function emitSystemAnnounceId(id, message)
        {
            io.to(id).emit('system_announce', {system_log_value : message});
        }

        /* room内の全員にシステムアナウンスをする */
        function emitSystemAnnounceRoom(room, message)
        {
            io.to(room).emit('system_announce', {system_log_value : message});
        }


        function getWordColor(message)
        {
            var fontColor = "";

            client.query("SELECT word, color FROM word_colors WHERE word ='" + message + "'", function(err, result)
            {
                for(i=0; i < result.rows.length; i++)
                {
                    fontColor = result.rows[i].color;
                    console.log("2nd"+fontColor);
                }

                if (typeof fontColor === 'undefined')
                {
                    fontColor = '#000000';
                }
            });
            console.log("3rd"+fontColor);
            return fontColor;
        }

        /* チャットログの取得 */
        function getChatLogs(id)
        {
            client.query("SELECT message, font_size, font_color, user_name FROM chat_logs ORDER BY message_id", function(err, result)
            {
                for(i=0; i < result.rows.length; i++)
                {
                    io.to(id).emit('append_chat', 
                    {
                        user_name_value  : result.rows[i].user_name,
                        font_size_value  : result.rows[i].font_size,
                        font_color_value : result.rows[i].font_color,
                        message_value    : result.rows[i].message
                    });
                    //console.log(result.rows[i].user_name + result.rows[i].font_size + result.rows[i].font_color + result.rows[i].message);
                }
            });
        }

    }); 
});


