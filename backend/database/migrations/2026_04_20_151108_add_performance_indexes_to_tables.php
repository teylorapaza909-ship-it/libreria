<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->index('fecha');
            $table->index('id_caja');
        });
        Schema::table('productos', function (Blueprint $table) {
            $table->index('nombre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropIndex(['fecha']);
            $table->dropIndex(['id_caja']);
        });
        Schema::table('productos', function (Blueprint $table) {
            $table->dropIndex(['nombre']);
        });
    }
};
