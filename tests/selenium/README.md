# Column Configuration

Test data files are named after what columns are in them.

| File     | Contents  |
| -------- | --------- |
| none.csv | []        |
| a.csv    | [A]       |
| ab.csv   | [A,B]     |
| abc.csv  | [A,B,C]   |
| abcd.csv | [A,B,C,D] |
| xyz.csv  | [X,Y,Z]   |

## No Defn, No Prefs

| Seq | Defn | Prefs | Source    | Expected Output | Reason         |
| --- | ---- | ----- | --------- | --------------- | -------------- |
| 1   |      |       | [A,B,C]   | [A,B,C]         |                |
| 2   |      |       | [A,B,C,D] | [A,B,C,D]       | Column added   |
| 3   |      |       | [A,B,C]   | [A,B,C]         | Column removed |
| 4   |      |       | [X,Y,Z]   | [X,Y,Z]         |                |

## Defn Only

| Seq | Defn  | Prefs | Source  | Expected Output | Reason                          |
| --- | ----- | ----- | ------- | --------------- | ------------------------------- |
| 1   | [B,A] |       | [A]     | [A]             | Defn column missing from source |
| 2   | [B,A] |       | [A,B]   | [B,A]           |                                 |
| 3   | [B,A] |       | [A,B,C] | [B,A]           | Source column missing from defn |
| 4   | [B,A] |       | [X,Y,Z] | []              |                                 |

## Prefs Only

| Seq | Defn | Prefs | Source    | Expected Output | Reason       |
| --- | ---- | ----- | --------- | --------------- | ------------ |
| 1   |      | [C,B] | [A,B,C]   | [C,B,A]         |              |
| 2   |      | [C,B] | [A,B,C,D] | [C,B,A,D]       | Column added |
| 3   |      | [C,B] | [X,Y,Z]   | [X,Y,Z]         |              |

## Defn and Prefs

| Seq | Defn  | Prefs | Source    | Expected Output | Reason                           |
| --- | ----- | ----- | --------- | --------------- | -------------------------------- |
| 1   | [B,A] | [C,B] | [A]       | [A]             | Defn column missing from source  |
| 2   | [B,A] | [C,B] | [A,B]     | [B,A]           | Prefs column missing from source |
| 3   | [B,A] | [C,B] | [A,B,C]   | [B,A]           |                                  |
| 4   | [B,A] | [C,B] | [A,B,C,D] | [B,A]           | Column added                     |
| 5   | [B,A] | [C,B] | [X,Y,Z]   | []              |                                  |

## Defn and Prefs 2

| Seq | Defn  | Prefs   | Source    | Expected Output | Reason                           |
| --- | ----- | ------- | --------- | --------------- | -------------------------------- |
| 1   | [B,A] | [A,B,C] | [A]       | [A]             | Defn column missing from source  |
| 2   | [B,A] | [A,B,C] | [A,B]     | [A,B]           | Prefs column missing from source |
| 3   | [B,A] | [A,B,C] | [A,B,C]   | [A,B]           |                                  |
| 4   | [B,A] | [A,B,C] | [A,B,C,D] | [A,B]           |                                  |
| 5   | [B,A] | [A,B,C] | [X,Y,Z]   | []              |                                  |

# Source Parameters

There are two major ways to send parameters to a source: by sending the inputs from an entire form, and by sending selected individual inputs.  The two methods result in slightly different behavior, so while the tests are broadly the same, they do have individual tweaks.

## Form Method

* Also gathers unrelated inputs such as the "group mode" (i.e. summary vs. details) radio buttons.
* Can't tell whether a checkbox should be interpreted normally or as a toggle, so it conforms to standard HTML form submission semantics.

## Individual Method

* Only captures the inputs specified.
* Fully supports sending toggle checkboxes as "on" or "off."
