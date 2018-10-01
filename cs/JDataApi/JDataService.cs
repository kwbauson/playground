using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace JDataApi
{
    public class JDataService
    {
        private string _jsonFilePath = "data.json";
        private JToken _json;

        public JDataService()
        {
            if (File.Exists(_jsonFilePath))
            {
                _json = JToken.Parse(File.ReadAllText(_jsonFilePath));
            }
            else
            {
                _json = new JObject();
            }
        }

        public JToken Get(string path) => Get(GetPath(path));
        public bool Add(string path, JToken value) => Add(GetPath(path), value);
        public bool Replace(string path, JToken value) => Replace(GetPath(path), value);
        public bool Remove(string path) => Remove(GetPath(path));

        private JToken Get(IEnumerable<string> path)
        {
            var current = _json;
            foreach (var key in path)
            {
                if (current == null) break;
                if (current is JArray array)
                {
                    var index = Convert.ToInt32(key);
                    if (index >= 0 && index < array.Count)
                    {
                        current = array[index];
                    }
                    else
                    {
                        return null;
                    }
                }
                else
                {
                    current = current[key];
                }
            }
            return current;
        }

        private bool Add(IEnumerable<string> path, JToken value)
        {
            var parentPath = path.Take(path.Count() - 1);
            var key = path.Last();
            var parent = Get(parentPath);

            if (parent == null) return false;
            if (parent is JArray parentArray)
            {
                var index = Convert.ToInt32(key);
                if (index == -1)
                {
                    parentArray.Add(value);
                    Sync();
                    return true;
                }
                else if (index < parentArray.Count)
                {
                    parentArray.Insert(index, value);
                    Sync();
                    return true;
                }
                else
                {
                    return false;
                }
            }
            else if (parent is JObject parentObject)
            {
                parent[key] = value;
                Sync();
                return true;
            }
            else
            {
                return false;
            }
        }

        private bool Replace(IEnumerable<string> path, JToken value)
        {
            var old = Get(path);
            if (old != null)
            {
                old.Replace(value);
                Sync();
                return true;
            }
            else
            {
                return false;
            }
        }

        private bool Remove(IEnumerable<string> path)
        {
            var value = Get(path);
            if (value != null)
            {
                if (value.Parent is JProperty property)
                {
                    property.Remove();
                }
                else
                {
                    value.Remove();
                }
                Sync();
                return true;
            }
            else
            {
                return false;
            }
        }

        private IEnumerable<string> GetPath(string path)
        {
            return (path?.Split('/') ?? new string[] { }).Prepend("#");
        }

        private void Sync()
        {
            File.WriteAllText(_jsonFilePath, _json.ToString());
        }
    }
}