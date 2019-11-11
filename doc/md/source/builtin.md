# Builtin Sources

The following sources are all builtin to DataVis.

## Local Data

- type: `local`
- formats: JSON object

The local origin gets its data from a property of `window`, which should be an object containing both the data and the type info.

``` javascript
window.localData = {
  data: [{
    FIELD: VALUE
  }],
  typeInfo: {
    FIELD: {
      type: TYPE
    }
  }
};

var source = new MIE.WC_DataVis.Source({
  type: 'local',
  varName: 'localData'
});
```

## HTTP Request

- type: `http`
- formats: CSV, JSON, XML

The HTTP request data source simply makes an AJAX request to get data. The data can either be in JSON or XML. You don't need to indicate which one is being used, we figure it out automatically. However, you must adhere to a specific format for the data, which is outlined below.

``` javascript
var source = new MIE.WC_DataVis.Source({
  type: 'http',
  url: '/data.json'
});
```

### JSON Data

Here's the format for data expressed using JSON.

``` javascript
{
  data: [
    {
      FIELD: VALUE,
      /* more fields */
    },
    /* more rows */
  ],
  typeInfo: {
    FIELD: { /* type info */ },
    /* more fields */
  }
}
```

### XML Data

Here's the format for data expressed using XML.

``` xml
<root>
  <data>
    <item>
      <FIELD>VALUE</FIELD>
      <!-- more fields -->
    </item>
    <!-- more rows -->
  </data>
  <typeInfo>
    <FIELD>
      <!-- type info -->
    </FIELD>
    <!-- more fields -->
  </typeInfo>
</root>
```

Unlike in JSON, there are no data types inherent to XML, so for the sake of performance it's a good idea to fully specify the type of any non-string fields.  This can be done in the XML data file as shown above, or in the Source specification like this:

``` javascript
var source = new MIE.WC_DataVis.Source({
  type: 'http',
  url: '/data.xml'
}, null, {
  'Name': 'string',
  'Age': 'number',
  'Balance': 'currency',
  'Last_Seen': 'date'
});
```

### CSV Data

There is no opportunity to include type info with the CSV file, so it should be supplied to the source instead.  Just like with XML, there are no data types inherent to CSV, so for the sake of performance it's a good idea to fully specify the type of any non-string fields.

``` javascript
var source = new MIE.WC_DataVis.Source({
  type: 'http',
  url: '/data.csv'
}, null, {
  'Name': 'string',
  'Age': 'number',
  'Balance': 'currency',
  'Last_Seen': 'date'
});
```
