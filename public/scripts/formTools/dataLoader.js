

export class DataLoader {
  constructor() {
    this.params = null;
    this.dictValues = null;
    this.filters = {};
    this.parameterFilters = {};
    this.mainFiles = {
      param: 'param.txt',
      paramdict: 'paramdict.txt'
    }
  }

  checkEnv() {
    const envString = document.getElementById('env-info')
    console.log(envString, 'ENVV')
    if (envString?.value) {
      this.versionFile = -1
    }
  }

  async init(version, groupNumber, lang) {
    this.versionFile = version
    this.checkEnv()
    this.groupNumber = groupNumber
    this.lang = lang || 'pl';
    this.mainPath = `/data/${groupNumber}/data/versions/${version}/${this.lang}/`
    this.dictFile = `${this.mainFiles.paramdict}`
    this.paramFile = `${this.mainFiles.param}`
  }



  async loadData(file) {
    console.log(file, 'siema eniu')
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error("Błąd ładowania- " + response.status);
      const text = await response.text();

      const rows = text.split("\n");

      let data = [];
      for (let i = 0; i < rows.length; i++) {
        data.push(rows[i].split("\t"));
      }

      return data;
    } catch (error) {
      console.warn(`Błąd ładowania - brak pliku ${file}`,);
      return null;
    }
  }

  async parseData() {
    const paramsData = await this.loadData(`${this.mainPath}${this.paramFile}`);
    const dictData = await this.loadData(`${this.mainPath}${this.dictFile}`);

    if (!paramsData || !dictData) {
      console.error("Nie udało się wczytać CSV");
      return null;
    }

    console.log("CSV przetworzone");
    this.params = this.convertDataToObjects(paramsData);
    this.dictValues = this.convertDataToObjects(dictData);
    return {
      params: this.params,
      dictValues: this.dictValues,
    };
  }

  convertDataToObjects(csvData) {
    let headers = csvData[0];

    for (let header_idx = 0; header_idx < headers.length; header_idx++) {

      headers[header_idx] = headers[header_idx].replace(/\r/g, "");
    }

    let objects = [];

    for (let row = 1; row < csvData.length; row++) {
      let obj = {};

      for (let col = 0; col < headers.length; col++) {
        obj[headers[col]] = csvData[row][col] ? csvData[row][col] : null;
        // ostatnia kolumna - fix nowej linii
        if (obj.hasOwnProperty("FORMULA") && obj.FORMULA != null) {
          obj.FORMULA = obj.FORMULA.replace(/\r/g, "");
        }
        if (obj.hasOwnProperty("DEFAULT") && obj.DEFAULT != null) {
          obj.DEFAULT = obj.DEFAULT.replace(/\r/g, "");
        }
        if (obj.hasOwnProperty("MULTI") && obj.MULTI != null) {
          obj.MULTI = obj.MULTI.replace(/\r/g, "");
        }
      }
      objects.push(obj);
    }
    return objects;
  }

  convertDictValues(dictData) {
    let resultList = {};
    this.parameterFilters = {};

    if (!dictData || dictData.length === 0) {
      console.warn("Brak danych w słowniku");
      return resultList;
    }

    for (let i = 0; i < dictData.length; i++) {
      let row = dictData[i];

      for (let key in row) {
        if (row.hasOwnProperty(key)) {
          if (!key.endsWith("_VALUE")) {
            continue;
          }

          let paramName = key.replace("_VALUE", "");

          let value = row[key];
          let description = row[paramName + "_DESCRIPTION"];

          if (value === "<NULL>") {
            value = null;
          }

          if (description === "<NULL>") {
            description = null;
          }

          if (value === null && description === null) {
            continue;
          }

          let enable = row[paramName + "_ENABLE"];
          let proc = row[paramName + "_PROC"];
          let attributes = row[paramName + "_ATTRS"];

          if (enable === "<NULL>") {
            enable = null;
          }

          if (proc === "<NULL>") {
            proc = null;
          }

          if (attributes === "<NULL>" || attributes === undefined || attributes === null) {
            attributes = null;
          } else {
            attributes = this.normalizeAttributes(attributes);
          }

          let result = {
            ROW_NUM: row["ROW_NUM"],
            VALUE: value,
            DESCRIPTION: description,
            ENABLE: enable,
            PROC: proc,
            ATTRIBUTES: attributes,
          };

          if (!resultList[paramName]) {
            resultList[paramName] = [];
          }

          resultList[paramName].push(result);

          if (!this.parameterFilters[paramName]) {
            this.parameterFilters[paramName] = {};
          }

          if (attributes) {
            for (const [attrKey, attrValue] of Object.entries(attributes)) {
              if (!this.parameterFilters[paramName][attrKey]) {
                this.parameterFilters[paramName][attrKey] = [];
              }
              // Dodaj tylko unikalne wartości
              if (!this.parameterFilters[paramName][attrKey].includes(attrValue)) {
                this.parameterFilters[paramName][attrKey].push(attrValue);
              }
            }
          }

        }
      }
    }


    return resultList;
  }

  async checkCollection(param) {
    await formsManager.loadDataPerClient(param)
  }

  normalizeAttributes(string) {
    const result = {};
    if (typeof string !== 'string' || string.trim() === '') {
      return result;
    }
    let attrList = string.split('|');
    for (let pair of attrList) {
      if (pair && pair.includes('=')) {
        let x = pair.split('=');
        result[x[0]] = x[1];
      }
    }
    return result;
  }

  createParameterFilters(resultList) {
    this.parameterFilters = {};

    for (const [paramName, entries] of Object.entries(resultList)) {
      const filters = {};

      for (const entry of entries) {
        if (!entry.ATTRIBUTES) continue;

        for (const [attrKey, attrValue] of Object.entries(entry.ATTRIBUTES)) {

          if (!filters[attrKey]) {
            filters[attrKey] = new Set();
          }
          filters[attrKey].add(attrValue);
        }
      }


      this.parameterFilters[paramName] = {};
      for (const [key, values] of Object.entries(filters)) {
        this.parameterFilters[paramName][key] =
          Array.from(values).sort((a, b) => a.localeCompare(b));
      }
    }
  }

  async selectPrices(params) {
   console.log(params, 'jestem w selectprices')
    const [path, scripts] = await formsManager.getClientScripts()
    console.log(scripts, path)
    for (const param of params) {
      let scriptPath = scripts.find(script => script.param == param.NAME)
      console.log(scriptPath, 'foundScripts')
      if (param?.SCRIPTS == 'true' && scriptPath) {
        param.SOURCE = `${path}${scriptPath.file}`
      }
    }
    return params
  }

  async selectCollections(values) {
    const aliases = await formsManager.loadDataPerClient(this.groupNumber)

    const result = JSON.parse(JSON.stringify(values))

    for (const [param, aliasList] of Object.entries(aliases)) {
      if (result[param]?.length) {
        result[param] = result[param].filter(valueEntry => {
          const matchedAlias = aliasList.find(
            alias => alias.VALUE === valueEntry.VALUE
          );

          if (matchedAlias) {
            valueEntry.ALIAS = matchedAlias.ALIAS;
            valueEntry.ALIAS_DESCRIPTION = matchedAlias.DESCRIPTION?.replace(/\r/g, '').trim();
            return true;
          }
          return false;
        });

        if (result[param].length === 0) {
          delete result[param];
        }
      }
    }

    return result;
  }

  getFiltersForParameter(paramName) {
    if (!this.parameterFilters) return {};
    return this.parameterFilters[paramName] || {};
  }

  addFilters(name, filterObj) {
    this.filters[name] = filterObj;
  }


  getAllFilters() {
    return this.parameterFilters;
  }
}
