<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'usuarios';
    public $timestamps = false;
    
    protected $hidden = [
        'password',
    ];
    
    protected $fillable = [
        'usuario',
        'password',
        'rol',
        'estado'
    ];
}
