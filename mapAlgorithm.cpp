#include <iostream>
#include <fstream>
#include "json.hpp"
#include <vector>
#include <string>
#include <queue>

using json = nlohmann::json;

struct edge
{
  int distance;
  int destination;
};

struct node
{
  int id;
  std::string name;
  std::string type;
  int floorNumber;
  std::vector<edge> neighbors;
};

struct floorPlan
{
  int number;
  std::vector<node> rooms;
};

struct building
{
  std::string name;
  std::vector<floorPlan> floors;
};

struct campus
{
  std::vector<building> buildings;
}; 

floorPlan loadFloor(const std::string& file, std::string& building)
{
  std::ifstream _file(file); //example json load
  if(!_file)
  {
    std::cerr << "No file found";
    std::exit(-1);
  }

  json data;
  _file >> data;
  
}



int main()
{

  return 0;
}
