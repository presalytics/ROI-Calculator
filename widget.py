import presalytics
from presalytics.lib.widgets.d3 import D3Widget

default_data = {
    "employees": 10,
    "cost_per_employee": 60,
    "percent_of_time": 40,
    "presalytics_integration": True,
    "company_size": 100
}

w = D3Widget(
    'roi-calculator',
    default_data,
    script_filename='roi.js',
    css_filename='roi.css',
    html_filename='roi.html'
)
