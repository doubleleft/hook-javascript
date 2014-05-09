<?php
$url = $_SERVER['HTTP_X_ENDPOINT'];
$url .= preg_replace('/.*\/proxy.php\//', '', $_SERVER['REQUEST_URI']);
if (strlen($_SERVER['QUERY_STRING'] > 0)) {
	$url .= '?'.$_SERVER['QUERY_STRING'];
}

$method = $_SERVER['REQUEST_METHOD'];
$headers = array(
	'X-App-Id: ' . $_SERVER['HTTP_X_APP_ID'],
	'X-App-Key: ' . $_SERVER['HTTP_X_APP_KEY'],
);

if(isset($_SERVER['HTTP_X_AUTH_TOKEN'])){
	array_push($headers, 'X-Auth-Token: '. $_SERVER['HTTP_X_AUTH_TOKEN']);
}

if(isset($_SERVER['CONTENT_TYPE'])){
	array_push($headers, 'Content-Type: '.$_SERVER['CONTENT_TYPE']);
}

// Prepare proxy request
$ch = curl_init();
curl_setopt($ch,CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
if($method == 'POST' || $method == 'PUT'){
	$json = $HTTP_RAW_POST_DATA;
	curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
	array_push($headers, 'Content-Length: '.strlen($json));
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Execute the request
header('Content-Type: ' . $content_type);
$result = curl_exec($ch);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);
