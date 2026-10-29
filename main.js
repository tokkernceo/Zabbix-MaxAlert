var Max = {
    token: null,
    to: null,
    message: null,
    proxy: null,
    format: null,

    escapeMarkdown: function (str) {
        return str.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
    },

    escapeHtml: function (str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    },

    sendMessage: function () {
        var params = {
            text: this.message,
        },
        body,
        response,
        request = new HttpRequest(),
        url = 'https://platform-api.max.ru/messages?chat_id=' + encodeURIComponent(this.to);

        if (this.format !== null && (this.format === 'markdown' || this.format === 'html')) {
            params['format'] = this.format;
        }

        body = JSON.stringify(params);

        if (this.proxy) {
            request.setProxy(this.proxy);
        }

        request.addHeader('Content-Type: application/json');
        request.addHeader('Authorization: ' + this.token);

        Zabbix.log(4, '[MAX Webhook] URL: ' + url.replace(/chat_id=[^&]+/, 'chat_id=***'));
        Zabbix.log(4, '[MAX Webhook] Body: ' + body);
        
        response = request.post(url, body);
        Zabbix.log(4, '[MAX Webhook] HTTP code: ' + request.getStatus());
        Zabbix.log(4, '[MAX Webhook] Response: ' + response);

        if (request.getStatus() !== 200) {
            var errorMsg = 'HTTP error: ' + request.getStatus();
            
            try {
                var errorResponse = JSON.parse(response);
                if (errorResponse.error) {
                    errorMsg = errorResponse.error;
                }
                if (errorResponse.description) {
                    errorMsg = errorResponse.description;
                }
            } catch (e) {
            }
            
            throw errorMsg;
        }
        
        try {
            var successResponse = JSON.parse(response);
            Zabbix.log(4, '[MAX Webhook] Success response: ' + JSON.stringify(successResponse));
        } catch (error) {
            Zabbix.log(4, '[MAX Webhook] Could not parse response as JSON');
        }
    }
};

try {
    var params = JSON.parse(value);

    if (typeof params.Token === 'undefined' || params.Token === '') {
        throw 'Incorrect value for parameter "Token": parameter is missing or empty';
    }
    if (typeof params.To === 'undefined' || params.To === '') {
        throw 'Incorrect value for parameter "To": parameter is missing or empty (this should be the chat_id)';
    }

    Max.token = params.Token;
    Max.to = params.To;

    if (params.HTTPProxy) {
        Max.proxy = params.HTTPProxy;
    }

    if (params.ParseMode) {
        var mode = params.ParseMode.toLowerCase();
        if (mode === 'markdown' || mode === 'html') {
            Max.format = mode;
        }
    }

    var rawMessage = params.Subject + '\n' + params.Message;
    
    if (Max.format === 'markdown') {
        rawMessage = Max.escapeMarkdown(rawMessage);
    } else if (Max.format === 'html') {
        rawMessage = Max.escapeHtml(rawMessage);
    }
    
    Max.message = rawMessage;

    Max.sendMessage();

    return 'OK';
}
catch (error) {
    Zabbix.log(4, '[MAX Webhook] notification failed: ' + error);
    throw 'Sending failed: ' + error + '.';
}
