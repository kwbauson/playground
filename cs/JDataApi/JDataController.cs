using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;

namespace JDataApi
{
    [ApiExplorerSettings]
    public class JDataController : ControllerBase
    {
        private readonly JDataService _service;

        public JDataController(JDataService service)
        {
            _service = service;
        }

        [HttpGet("{*path}")]
        public ActionResult<JToken> Get(string path)
        {
            var result = _service.Get(path);
            if (result != null)
            {
                return result;
            }
            else
            {
                return NotFound();
            }
        }

        [HttpPost("{*path}")]
        public IActionResult Add(string path, [FromBody] JToken value)
        {
            if (_service.Add(path, value))
            {
                return Ok();
            }
            else
            {
                return NotFound();
            }
        }

        [HttpPut("{*path}")]
        public IActionResult Replace(string path, [FromBody] JToken value)
        {
            if (_service.Replace(path, value))
            {
                return Ok();
            }
            else
            {
                return NotFound();
            }
        }

        [HttpDelete("{*path}")]
        public IActionResult Remove(string path)
        {
            if (_service.Remove(path))
            {
                return Ok();
            }
            else
            {
                return NotFound();
            }
        }
    }
}