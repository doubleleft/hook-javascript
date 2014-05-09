<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Net" %>
<script language="c#" runat="server">
    public void Page_Load(object sender, EventArgs e)
    {
        //retrieve data
        var method = Request.HttpMethod;
        var query = Request.Url.Query;
        var url = Request.Headers["X-Endpoint"] + query.Replace("?q=", "");

        var req = WebRequest.Create(url) as HttpWebRequest;

        //set up the request
        req.Headers["X-App-Id"] = Request.Headers["X-App-Id"];
        req.Headers["X-App-Key"] = Request.Headers["X-App-Key"];

        if (Request.Headers["HTTP_X_AUTH_TOKEN"] != null)
            req.Headers["X-Auth-Token"] = Request.Headers["HTTP_X_AUTH_TOKEN"];

        req.ContentType = Request.ContentType;
        req.Method = method;

        //setup the response
        Response.Clear();
        Response.ContentType = "application/json";

        //begin to flush the response
        try
        {
            //forward post data to the dl-api
            if (method.ToLower().Equals("post") || method.ToLower().Equals("put"))
            {
                Request.InputStream.Seek(0, SeekOrigin.Begin);
                var jsonData = new StreamReader(Request.InputStream).ReadToEnd();

                using (var streamWriter = new StreamWriter(req.GetRequestStream()))
                {
                    streamWriter.Write(jsonData);
                    streamWriter.Flush();
                    streamWriter.Close();
                }
            }

            //get dl-api response
            var res = req.GetResponse() as HttpWebResponse;
            using (var stream = new StreamReader(res.GetResponseStream()))
            {
                Response.Write(stream.ReadToEnd());
            }
        }
        catch (Exception ex)
        {
            Response.StatusCode = 500;
            Response.Write(ex.Message);
        }
    }
</script>