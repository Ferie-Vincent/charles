<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectPhoto extends Model
{
    protected $fillable = ['project_id', 'user_id', 'path', 'caption', 'tag', 'taken_at'];

    protected $casts = ['taken_at' => 'date'];

    public function project() { return $this->belongsTo(Project::class); }
    public function user()    { return $this->belongsTo(User::class); }
}
