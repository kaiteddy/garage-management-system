from datetime import datetime


def format_date_for_display(date_string):
    """Convert date from YYYY-MM-DD or MM/DD/YYYY to DD-MM-YYYY format for display"""
    if not date_string or date_string == '-' or date_string == '':
        return '-'

    try:
        if '-' in date_string:
            date_obj = datetime.strptime(date_string, '%Y-%m-%d')
        elif '/' in date_string:
            date_obj = datetime.strptime(date_string, '%m/%d/%Y')
        else:
            return date_string  # Return as-is if format is unrecognized
        return date_obj.strftime('%d-%m-%Y')
    except ValueError:
        return date_string  # Return original if parsing fails


def test_format_date_standard():
    assert format_date_for_display('2020-07-10') == '10-07-2020'
    assert format_date_for_display('2021-01-13') == '13-01-2021'


def test_format_date_slash_format():
    assert format_date_for_display('07/10/2020') == '10-07-2020'
    assert format_date_for_display('12/31/1999') == '31-12-1999'


def test_format_date_edge_cases():
    assert format_date_for_display(None) == '-'
    assert format_date_for_display('') == '-'
    assert format_date_for_display('-') == '-'


def test_format_date_unrecognized_or_invalid():
    assert format_date_for_display('20200710') == '20200710'
    assert format_date_for_display('2020-15-40') == '2020-15-40'
