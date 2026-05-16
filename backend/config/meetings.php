<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Checklist completion alert threshold (percent)
    |--------------------------------------------------------------------------
    | When the AI-generated task checklist completion rate falls below this
    | value, MeetingMetricsController sets below_threshold = true on the
    | checklists payload. Tune after first 30 days of production data.
    */
    'checklist_threshold_pct' => env('MEETING_CHECKLIST_THRESHOLD_PCT', 20),
];
