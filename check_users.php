<?php
$conn = new mysqli('localhost', 'root', '', 'utiles_db');
if ($conn->connect_error) { die('Error: ' . $conn->connect_error); }
$result = $conn->query('SELECT id, usuario, rol, password FROM usuarios LIMIT 10');
while($row = $result->fetch_assoc()) {
    echo 'ID:' . $row['id'] . ' | usuario:' . $row['usuario'] . ' | rol:' . $row['rol'] . ' | pass:' . substr($row['password'],0,40) . PHP_EOL;
}
$conn->close();
