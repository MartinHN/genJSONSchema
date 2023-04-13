#include <array>
#include <iostream>
#include <string>
#include <vector>

struct SimpleMemberClass {

  int insideMember;
  std::array<long long, 512> universe;
};

struct RootAPI {
  std::string name = "lololo";
  unsigned char counter = 0;
  int intValue = 0;
  std::array<float, 3> color;

  // void simpleAction() { std::cout << "simple action " << std::endl; }
  void save(){};
  int simpleArg(int arg) { return arg; };

  SimpleMemberClass simpleMemberClass;
  std::array<long long, 512> universe;
  std::array<SimpleMemberClass, 512> lluniverse;
  std::vector<int> intVector;
  std::vector<std::string> strVector;
  // std::vector<SimpleMemberClass> classVector;
};
